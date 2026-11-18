import { ConflictException, NotFoundException } from '@nestjs/common';
import { HallsService } from './halls.service';

describe('HallsService', () => {
  let service: HallsService;

  beforeEach(() => {
    service = new HallsService();
  });

  it('lists seats row by row', () => {
    const hall = service.create({ name: 'Red hall', rows: 2, seatsPerRow: 3 });

    expect(service.listSeats(hall)).toEqual([
      { row: 1, seat: 1 },
      { row: 1, seat: 2 },
      { row: 1, seat: 3 },
      { row: 2, seat: 1 },
      { row: 2, seat: 2 },
      { row: 2, seat: 3 },
    ]);
  });

  it('keeps hall names unique', () => {
    service.create({ name: 'Red hall', rows: 2, seatsPerRow: 3 });

    expect(() =>
      service.create({ name: 'Red hall', rows: 5, seatsPerRow: 5 }),
    ).toThrow(ConflictException);
  });

  it('refuses to delete a hall that a registered check reports as used', () => {
    const used = service.create({ name: 'Used', rows: 1, seatsPerRow: 1 });
    const free = service.create({ name: 'Free', rows: 1, seatsPerRow: 1 });
    service.registerUsageCheck((id) => id === used.id);

    expect(() => service.remove(used.id)).toThrow(ConflictException);
    expect(() => service.remove(free.id)).not.toThrow();
    expect(() => service.findOne(free.id)).toThrow(NotFoundException);
  });
});
