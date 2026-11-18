import { BadRequestException } from '@nestjs/common';
import { QueryFailedError, Repository } from 'typeorm';
import { FilmsService } from '../films/films.service';
import { HallsService } from '../halls/halls.service';
import { Showing } from './entities/showing.entity';
import { ShowingsService } from './showings.service';

/** The error TypeORM throws when PostgreSQL rejects a query. */
const databaseError = (code: string): QueryFailedError =>
  new QueryFailedError(
    'query',
    [],
    Object.assign(new Error('raw database message'), { code }),
  );

describe('ShowingsService', () => {
  const repository = {
    create: jest.fn((data: Partial<Showing>) => data),
    save: jest.fn((showing: Partial<Showing>) =>
      Promise.resolve({ id: 'showing-id', ...showing }),
    ),
  };
  const filmsService = { exists: jest.fn() };
  const hallsService = { exists: jest.fn() };
  let service: ShowingsService;

  const dto = {
    filmId: 'film-id',
    hallId: 'hall-id',
    startsAt: '2030-05-01T20:30:00+02:00',
    price: 12500,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    filmsService.exists.mockResolvedValue(true);
    hallsService.exists.mockResolvedValue(true);
    service = new ShowingsService(
      repository as unknown as Repository<Showing>,
      filmsService as unknown as FilmsService,
      hallsService as unknown as HallsService,
    );
  });

  it('stores the start time as a moment, whatever offset it came with', async () => {
    const showing = await service.create(dto);

    expect(showing).toEqual({
      id: 'showing-id',
      filmId: 'film-id',
      hallId: 'hall-id',
      startsAt: new Date('2030-05-01T18:30:00.000Z'),
      price: 12500,
    });
  });

  it('names the film that does not exist', async () => {
    filmsService.exists.mockResolvedValue(false);

    await expect(service.create(dto)).rejects.toThrow(
      new BadRequestException('Film with id film-id not found'),
    );
    expect(repository.save).not.toHaveBeenCalled();
  });

  it('names the hall that does not exist', async () => {
    hallsService.exists.mockResolvedValue(false);

    await expect(service.create(dto)).rejects.toThrow(
      new BadRequestException('Hall with id hall-id not found'),
    );
    expect(repository.save).not.toHaveBeenCalled();
  });

  it('answers 400 when the film or the hall is deleted before the insert', async () => {
    repository.save.mockRejectedValueOnce(databaseError('23503'));

    await expect(service.create(dto)).rejects.toThrow(
      new BadRequestException(
        'The film or the hall of the showing no longer exists',
      ),
    );
  });

  it('does not disguise other database failures', async () => {
    const outage = databaseError('08006');
    repository.save.mockRejectedValueOnce(outage);

    await expect(service.create(dto)).rejects.toBe(outage);
  });
});
