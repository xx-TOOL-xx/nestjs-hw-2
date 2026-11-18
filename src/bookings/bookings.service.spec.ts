import { BadRequestException, ConflictException } from '@nestjs/common';
import { DataSource, QueryFailedError, Repository } from 'typeorm';
import { HallsService } from '../halls/halls.service';
import { ShowingsService } from '../showings/showings.service';
import { BookingsService } from './bookings.service';
import { BookingSeat } from './entities/booking-seat.entity';
import { Booking } from './entities/booking.entity';

/** The error TypeORM throws when PostgreSQL rejects a query. */
const databaseError = (code: string): QueryFailedError =>
  new QueryFailedError(
    'INSERT INTO "booking_seats" ...',
    [],
    Object.assign(
      new Error('duplicate key value violates unique constraint "UQ_1"'),
      { code },
    ),
  );

describe('BookingsService', () => {
  const showing = { id: 'showing-id', hallId: 'hall-id', price: 12500 };
  const hall = { id: 'hall-id', name: 'Red hall', rows: 3, seatsPerRow: 5 };

  const dataSource = { transaction: jest.fn() };
  const bookingSeatsRepository = { find: jest.fn() };
  const showingsService = { findOne: jest.fn() };
  const hallsService = { findOne: jest.fn() };
  let service: BookingsService;

  beforeEach(() => {
    jest.resetAllMocks();
    showingsService.findOne.mockResolvedValue(showing);
    hallsService.findOne.mockResolvedValue(hall);
    service = new BookingsService(
      {} as Repository<Booking>,
      bookingSeatsRepository as unknown as Repository<BookingSeat>,
      dataSource as unknown as DataSource,
      showingsService as unknown as ShowingsService,
      hallsService as unknown as HallsService,
    );
  });

  it('writes the booking and its seats through the transaction manager', async () => {
    const manager = {
      create: jest.fn((_entity: unknown, data: object) => ({ ...data })),
      save: jest.fn((value: { id?: string } | object[]) => {
        if (!Array.isArray(value)) {
          value.id = 'booking-id';
        }
        return Promise.resolve(value);
      }),
    };
    dataSource.transaction.mockImplementation(
      (work: (transactionManager: typeof manager) => Promise<Booking>) =>
        work(manager),
    );

    const booking = await service.create('showing-id', {
      seats: [
        { row: 2, seat: 1 },
        { row: 1, seat: 3 },
      ],
    });

    expect(booking).toEqual({
      id: 'booking-id',
      showingId: 'showing-id',
      seats: [
        { row: 1, seat: 3 },
        { row: 2, seat: 1 },
      ],
      totalPrice: 25000,
    });
    expect(dataSource.transaction).toHaveBeenCalledTimes(1);
    // First the booking, then every seat with the generated booking id.
    expect(manager.save).toHaveBeenCalledTimes(2);
    expect(manager.save).toHaveBeenLastCalledWith([
      { bookingId: 'booking-id', showingId: 'showing-id', row: 1, seat: 3 },
      { bookingId: 'booking-id', showingId: 'showing-id', row: 2, seat: 1 },
    ]);
  });

  it('turns a unique violation into 409 that names the taken seats', async () => {
    dataSource.transaction.mockRejectedValue(databaseError('23505'));
    bookingSeatsRepository.find.mockResolvedValue([{ row: 1, seat: 2 }]);

    const failure = service.create('showing-id', {
      seats: [
        { row: 1, seat: 2 },
        { row: 1, seat: 1 },
      ],
    });

    await expect(failure).rejects.toBeInstanceOf(ConflictException);
    await expect(failure).rejects.toThrow(
      /^Already booked on this showing: row 1 seat 2$/,
    );
  });

  it('keeps the 409 free of database text when the seat cannot be named', async () => {
    dataSource.transaction.mockRejectedValue(databaseError('23505'));
    // The other booking was cancelled before the seats were looked up.
    bookingSeatsRepository.find.mockResolvedValue([]);

    await expect(
      service.create('showing-id', { seats: [{ row: 1, seat: 2 }] }),
    ).rejects.toThrow(
      new ConflictException(
        'One or more of the requested seats are already booked on this showing',
      ),
    );
  });

  it('leaves every other database failure a server error', async () => {
    for (const code of ['23503', '08006']) {
      const failure = databaseError(code);
      dataSource.transaction.mockRejectedValue(failure);

      await expect(
        service.create('showing-id', { seats: [{ row: 1, seat: 2 }] }),
      ).rejects.toBe(failure);
    }
  });

  it('rejects seats outside the hall before anything is written', async () => {
    await expect(
      service.create('showing-id', {
        seats: [
          { row: 4, seat: 1 },
          { row: 1, seat: 6 },
          { row: 1, seat: 1 },
        ],
      }),
    ).rejects.toThrow(
      new BadRequestException(
        'Hall "Red hall" has 3 rows of 5 seats, so these seats do not exist: row 4 seat 1, row 1 seat 6',
      ),
    );
    expect(dataSource.transaction).not.toHaveBeenCalled();
  });

  it('rejects a total price that does not fit the integer column', async () => {
    showingsService.findOne.mockResolvedValue({
      ...showing,
      price: 2_000_000_000,
    });

    await expect(
      service.create('showing-id', {
        seats: [
          { row: 1, seat: 1 },
          { row: 1, seat: 2 },
        ],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(dataSource.transaction).not.toHaveBeenCalled();
  });
});
