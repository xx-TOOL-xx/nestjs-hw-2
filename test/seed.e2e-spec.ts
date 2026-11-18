import { execSync } from 'node:child_process';
import { join } from 'node:path';
import { emptyTestDatabase, testDataSource } from './test-database';

type Counts = {
  films: number;
  halls: number;
  showings: number;
  showingDays: number;
  pastShowings: number;
  bookings: number;
  bookingSeats: number;
};

describe('Seed script (e2e)', () => {
  /** Runs the real command; the test database comes from the environment. */
  const runSeed = (): string =>
    execSync('npm run seed --silent', {
      cwd: join(__dirname, '..'),
      env: process.env,
      encoding: 'utf8',
      stdio: 'pipe',
    });

  const count = async (): Promise<Counts> => {
    const [counts]: Counts[] = await testDataSource.query(
      `SELECT
         (SELECT count(*)::int FROM films) AS "films",
         (SELECT count(*)::int FROM halls) AS "halls",
         (SELECT count(*)::int FROM showings) AS "showings",
         (SELECT count(DISTINCT (starts_at AT TIME ZONE 'UTC')::date)::int FROM showings) AS "showingDays",
         (SELECT count(*)::int FROM showings WHERE starts_at <= now()) AS "pastShowings",
         (SELECT count(*)::int FROM bookings) AS "bookings",
         (SELECT count(*)::int FROM booking_seats) AS "bookingSeats"`,
    );
    return counts;
  };

  beforeAll(async () => {
    await emptyTestDatabase();
  });

  afterAll(async () => {
    if (testDataSource.isInitialized) {
      await testDataSource.destroy();
    }
  });

  it('refuses to run before the migrations are applied', () => {
    expect(() => runSeed()).toThrow(/npm run migration:run/);
  });

  it('fills a freshly migrated database with the data set', async () => {
    await testDataSource.initialize();
    await testDataSource.runMigrations();

    const output = runSeed();

    expect(output).toContain('Seed finished');
    expect(await count()).toEqual({
      films: 2,
      halls: 2,
      showings: 4,
      // Four showings on four different dates, all of them still ahead.
      showingDays: 4,
      pastShowings: 0,
      bookings: 1,
      bookingSeats: 2,
    });

    const [booking]: { total_price: number; price: number }[] =
      await testDataSource.query(
        `SELECT b.total_price, s.price FROM bookings b
         JOIN showings s ON s.id = b.showing_id`,
      );
    expect(booking.total_price).toBe(booking.price * 2);
  });

  it('creates no duplicates when it is run again', async () => {
    const before = await count();

    const output = runSeed();

    expect(output).toContain('films: 0 inserted, 2 already in place');
    expect(await count()).toEqual(before);
  });
});
