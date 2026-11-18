import { emptyTestDatabase, testDataSource } from './test-database';

const APP_TABLES = ['booking_seats', 'bookings', 'films', 'halls', 'showings'];

type ColumnRow = {
  column_name: string;
  data_type: string;
  is_nullable: string;
  column_default: string | null;
};

describe('Migrations (e2e)', () => {
  /** Tables of the application; TypeORM's own `migrations` table is left out. */
  const tables = async (): Promise<string[]> => {
    const rows: { table_name: string }[] = await testDataSource.query(
      `SELECT table_name FROM information_schema.tables
       WHERE table_schema = 'public' AND table_name <> 'migrations'
       ORDER BY table_name`,
    );
    return rows.map((row) => row.table_name);
  };

  /** "name type [not null] [default ...]" for every column, in table order. */
  const columns = async (table: string): Promise<string[]> => {
    const rows: ColumnRow[] = await testDataSource.query(
      `SELECT column_name, data_type, is_nullable, column_default
       FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = $1
       ORDER BY ordinal_position`,
      [table],
    );
    return rows.map((row) =>
      [
        row.column_name,
        row.data_type,
        row.is_nullable === 'NO' ? 'not null' : 'null',
        row.column_default === null ? '' : `default ${row.column_default}`,
      ]
        .join(' ')
        .trim(),
    );
  };

  const uniqueIndexes = async (table: string): Promise<string[]> => {
    const rows: { indexdef: string }[] = await testDataSource.query(
      `SELECT indexdef FROM pg_indexes
       WHERE schemaname = 'public' AND tablename = $1 AND indexdef LIKE '%UNIQUE%'
       ORDER BY indexname`,
      [table],
    );
    return rows.map((row) => row.indexdef);
  };

  beforeAll(async () => {
    await emptyTestDatabase();
    await testDataSource.initialize();
  });

  afterAll(async () => {
    await testDataSource.destroy();
  });

  it('starts from a database without tables', async () => {
    expect(await tables()).toEqual([]);
  });

  it('creates the whole schema from an empty database', async () => {
    const executed = await testDataSource.runMigrations();

    expect(executed.length).toBeGreaterThanOrEqual(1);
    expect(await tables()).toEqual(APP_TABLES);
    expect(await testDataSource.showMigrations()).toBe(false);
  });

  it('leaves no difference between the schema and the entities', async () => {
    // The queries `migration:generate` would write; none means in sync.
    const pending = await testDataSource.driver.createSchemaBuilder().log();

    expect(pending.upQueries.map(({ query }) => query)).toEqual([]);
  });

  it('gives the columns the described types, defaults and NOT NULL', async () => {
    expect(await columns('films')).toEqual([
      'id uuid not null default gen_random_uuid()',
      'title character varying not null',
      'duration_minutes integer not null',
      'release_year integer not null',
    ]);
    expect(await columns('halls')).toEqual([
      'id uuid not null default gen_random_uuid()',
      'name character varying not null',
      'rows integer not null',
      'seats_per_row integer not null',
    ]);
    expect(await columns('showings')).toEqual([
      'id uuid not null default gen_random_uuid()',
      'film_id uuid not null',
      'hall_id uuid not null',
      'starts_at timestamp with time zone not null',
      'price integer not null',
    ]);
    expect(await columns('bookings')).toEqual([
      'id uuid not null default gen_random_uuid()',
      'showing_id uuid not null',
      'total_price integer not null',
      'created_at timestamp with time zone not null default now()',
    ]);
    expect(await columns('booking_seats')).toEqual([
      'id uuid not null default gen_random_uuid()',
      'booking_id uuid not null',
      'showing_id uuid not null',
      'row integer not null',
      'seat integer not null',
    ]);
  });

  it('makes hall names unique and a seat unique within a showing', async () => {
    const halls = await uniqueIndexes('halls');
    expect(halls.some((index) => index.endsWith('(name)'))).toBe(true);

    const seats = await uniqueIndexes('booking_seats');
    expect(seats).toContainEqual(
      expect.stringMatching(/UNIQUE INDEX .+\(showing_id, "?row"?, seat\)$/),
    );
  });

  it('declares the foreign keys with the described delete rules', async () => {
    const rows: Record<string, string>[] = await testDataSource.query(
      `SELECT c.conrelid::regclass::text AS "table",
              a.attname AS "column",
              c.confrelid::regclass::text AS "references",
              CASE c.confdeltype WHEN 'c' THEN 'CASCADE' WHEN 'a' THEN 'NO ACTION' ELSE c.confdeltype::text END AS "onDelete"
       FROM pg_constraint c
       JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = c.conkey[1]
       WHERE c.contype = 'f'`,
    );

    expect(rows.map((row) => Object.values(row).join(' ')).sort()).toEqual([
      // Deleting a booking deletes its seats in the database.
      'booking_seats booking_id bookings CASCADE',
      'booking_seats showing_id showings NO ACTION',
      'bookings showing_id showings NO ACTION',
      // A film or a hall with showings cannot be deleted, nothing cascades.
      'showings film_id films NO ACTION',
      'showings hall_id halls NO ACTION',
    ]);
  });

  it('reverts every migration back to an empty database', async () => {
    const [{ applied }]: { applied: number }[] = await testDataSource.query(
      'SELECT count(*)::int AS applied FROM migrations',
    );

    for (let step = 0; step < applied; step += 1) {
      await testDataSource.undoLastMigration();
    }

    expect(applied).toBeGreaterThanOrEqual(1);
    expect(await tables()).toEqual([]);
  });

  it('applies the migrations again after the revert', async () => {
    await testDataSource.runMigrations();

    expect(await tables()).toEqual(APP_TABLES);
  });
});
