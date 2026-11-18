import { EntityManager, EntityTarget, ObjectLiteral } from 'typeorm';
import { BookingSeat } from './bookings/entities/booking-seat.entity';
import { Booking } from './bookings/entities/booking.entity';
import dataSource from './data-source';
import { Film } from './films/entities/film.entity';
import { Hall } from './halls/entities/hall.entity';
import { Showing } from './showings/entities/showing.entity';

/**
 * Fills the database with a small data set for checking the API by hand.
 * Run it after the migrations: `npm run seed`.
 *
 * Every row has a fixed id and is inserted with ON CONFLICT DO NOTHING, so
 * running the script again finds the rows in place and adds nothing.
 */

/** A moment `days` days from now, at the given UTC hour. */
const inDays = (days: number, hourUtc: number): Date => {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + days);
  date.setUTCHours(hourUtc, 0, 0, 0);
  return date;
};

const dune = {
  id: 'a1000000-0000-4000-8000-000000000001',
  title: 'Dune: Part Two',
  durationMinutes: 166,
  releaseYear: 2024,
};
const arrival = {
  id: 'a1000000-0000-4000-8000-000000000002',
  title: 'Arrival',
  durationMinutes: 116,
  releaseYear: 2016,
};

const grandHall = {
  id: 'a2000000-0000-4000-8000-000000000001',
  name: 'Grand hall',
  rows: 8,
  seatsPerRow: 12,
};
const smallHall = {
  id: 'a2000000-0000-4000-8000-000000000002',
  name: 'Small hall',
  rows: 3,
  seatsPerRow: 5,
};

/** Four showings, each on its own day, starting tomorrow. */
const showings = [
  {
    id: 'a3000000-0000-4000-8000-000000000001',
    filmId: dune.id,
    hallId: grandHall.id,
    startsAt: inDays(1, 18),
    price: 15000,
  },
  {
    id: 'a3000000-0000-4000-8000-000000000002',
    filmId: arrival.id,
    hallId: smallHall.id,
    startsAt: inDays(2, 16),
    price: 9000,
  },
  {
    id: 'a3000000-0000-4000-8000-000000000003',
    filmId: dune.id,
    hallId: smallHall.id,
    startsAt: inDays(3, 20),
    price: 12500,
  },
  {
    id: 'a3000000-0000-4000-8000-000000000004',
    filmId: arrival.id,
    hallId: grandHall.id,
    startsAt: inDays(4, 12),
    price: 8000,
  },
];

/** Two neighbouring seats on the first showing. */
const bookedShowing = showings[0];
const bookedSeats = [
  { id: 'a5000000-0000-4000-8000-000000000001', row: 4, seat: 6 },
  { id: 'a5000000-0000-4000-8000-000000000002', row: 4, seat: 7 },
];
const booking = {
  id: 'a4000000-0000-4000-8000-000000000001',
  showingId: bookedShowing.id,
  totalPrice: bookedShowing.price * bookedSeats.length,
};
const bookingSeats = bookedSeats.map((seat) => ({
  ...seat,
  bookingId: booking.id,
  showingId: booking.showingId,
}));

/** Inserts the rows that are not in the table yet and reports the outcome. */
async function insertMissing<Entity extends ObjectLiteral>(
  manager: EntityManager,
  entity: EntityTarget<Entity>,
  label: string,
  rows: Partial<Entity>[],
): Promise<void> {
  const result = await manager
    .createQueryBuilder()
    .insert()
    .into(entity)
    .values(rows)
    .orIgnore()
    .returning('id')
    .execute();

  const inserted = (result.raw as unknown[]).length;
  console.log(
    `${label}: ${inserted} inserted, ${rows.length - inserted} already in place`,
  );
}

async function seed(): Promise<void> {
  await dataSource.initialize();
  try {
    if (await dataSource.showMigrations()) {
      throw new Error(
        'The schema is not up to date. Apply the migrations first: npm run migration:run',
      );
    }

    // One transaction: the data set appears as a whole or not at all.
    await dataSource.transaction(async (manager) => {
      await insertMissing(manager, Film, 'films', [dune, arrival]);
      await insertMissing(manager, Hall, 'halls', [grandHall, smallHall]);
      await insertMissing(manager, Showing, 'showings', showings);
      await insertMissing(manager, Booking, 'bookings', [booking]);
      await insertMissing(manager, BookingSeat, 'booking seats', bookingSeats);
    });
    console.log('Seed finished');
  } finally {
    await dataSource.destroy();
  }
}

seed().catch((error: unknown) => {
  console.error('Seed failed:', error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
