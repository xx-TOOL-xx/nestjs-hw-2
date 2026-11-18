import { ConflictException, NotFoundException } from '@nestjs/common';
import { QueryFailedError, Repository } from 'typeorm';
import { Hall } from './entities/hall.entity';
import { HallsService } from './halls.service';

/** The error TypeORM throws when PostgreSQL rejects a query. */
const databaseError = (code: string): QueryFailedError =>
  new QueryFailedError(
    'query',
    [],
    Object.assign(new Error('raw database message'), { code }),
  );

describe('HallsService', () => {
  const repository = {
    create: jest.fn((dto: Partial<Hall>) => dto),
    save: jest.fn(),
    delete: jest.fn(),
  };
  let service: HallsService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new HallsService(repository as unknown as Repository<Hall>);
  });

  it('lists seats row by row', () => {
    expect(service.listSeats({ rows: 2, seatsPerRow: 3 })).toEqual([
      { row: 1, seat: 1 },
      { row: 1, seat: 2 },
      { row: 1, seat: 3 },
      { row: 2, seat: 1 },
      { row: 2, seat: 2 },
      { row: 2, seat: 3 },
    ]);
  });

  it('turns a unique violation on the name into 409 without database text', async () => {
    repository.save.mockRejectedValue(databaseError('23505'));

    const failure = service.create({
      name: 'Red hall',
      rows: 2,
      seatsPerRow: 3,
    });

    await expect(failure).rejects.toThrow(ConflictException);
    await expect(failure).rejects.toThrow(
      'Hall named "Red hall" already exists',
    );
  });

  it('turns a foreign key violation on delete into 409', async () => {
    repository.delete.mockRejectedValue(databaseError('23503'));

    await expect(service.remove('hall-id')).rejects.toThrow(
      'Hall with id hall-id is referenced by at least one showing',
    );
  });

  it('answers 404 when there was no hall to delete', async () => {
    repository.delete.mockResolvedValue({ affected: 0 });

    await expect(service.remove('hall-id')).rejects.toThrow(NotFoundException);
  });

  it('deletes a hall that nothing refers to', async () => {
    repository.delete.mockResolvedValue({ affected: 1 });

    await expect(service.remove('hall-id')).resolves.toBeUndefined();
    expect(repository.delete).toHaveBeenCalledWith({ id: 'hall-id' });
  });

  it('does not disguise other database failures', async () => {
    const outage = databaseError('08006');
    repository.save.mockRejectedValue(outage);
    repository.delete.mockRejectedValue(outage);

    await expect(
      service.create({ name: 'Red hall', rows: 2, seatsPerRow: 3 }),
    ).rejects.toBe(outage);
    await expect(service.remove('hall-id')).rejects.toBe(outage);
  });
});
