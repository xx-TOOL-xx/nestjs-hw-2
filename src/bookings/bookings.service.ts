import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { Seat } from '../halls/entities/seat.entity';
import { HallsService } from '../halls/halls.service';
import { ShowingsService } from '../showings/showings.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { SeatStatus } from './dto/seat-status.dto';
import { Booking } from './entities/booking.entity';

const seatKey = ({ row, seat }: Seat): string => `${row}:${seat}`;
const describeSeat = ({ row, seat }: Seat): string => `row ${row} seat ${seat}`;

@Injectable()
export class BookingsService {
  private readonly bookings: Booking[] = [];

  constructor(
    private readonly showingsService: ShowingsService,
    private readonly hallsService: HallsService,
  ) {}

  findAll(): Booking[] {
    return [...this.bookings];
  }

  findByShowing(showingId: string): Booking[] {
    this.showingsService.findOne(showingId);
    return this.bookings.filter((booking) => booking.showingId === showingId);
  }

  /** Every check runs before anything is stored, so a booking is all or nothing. */
  create(showingId: string, dto: CreateBookingDto): Booking {
    const showing = this.showingsService.findOne(showingId);
    const hall = this.hallsService.findOne(showing.hallId);

    const missing = dto.seats.filter(
      (seat) => seat.row > hall.rows || seat.seat > hall.seatsPerRow,
    );
    if (missing.length > 0) {
      throw new BadRequestException(
        `Hall "${hall.name}" has ${hall.rows} rows of ${hall.seatsPerRow} seats, so these seats do not exist: ${missing.map(describeSeat).join(', ')}`,
      );
    }

    const taken = this.bookedSeatKeys(showingId);
    const conflicts = dto.seats.filter((seat) => taken.has(seatKey(seat)));
    if (conflicts.length > 0) {
      throw new ConflictException(
        `Already booked on this showing: ${conflicts.map(describeSeat).join(', ')}`,
      );
    }

    const booking: Booking = {
      id: randomUUID(),
      showingId,
      seats: dto.seats.map(({ row, seat }) => ({ row, seat })),
      totalPrice: showing.price * dto.seats.length,
    };
    this.bookings.push(booking);
    return booking;
  }

  seatMap(showingId: string): SeatStatus[] {
    const showing = this.showingsService.findOne(showingId);
    const hall = this.hallsService.findOne(showing.hallId);
    const taken = this.bookedSeatKeys(showingId);

    return this.hallsService
      .listSeats(hall)
      .map((seat) => ({ ...seat, isBooked: taken.has(seatKey(seat)) }));
  }

  remove(id: string): void {
    const index = this.bookings.findIndex((booking) => booking.id === id);
    if (index === -1) {
      throw new NotFoundException(`Booking with id ${id} not found`);
    }
    this.bookings.splice(index, 1);
  }

  private bookedSeatKeys(showingId: string): Set<string> {
    return new Set(
      this.bookings
        .filter((booking) => booking.showingId === showingId)
        .flatMap((booking) => booking.seats.map(seatKey)),
    );
  }
}
