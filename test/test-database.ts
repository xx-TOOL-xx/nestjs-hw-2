import { DataSource } from 'typeorm';
import { validate } from '../src/config/environment-variables';
import dataSource from '../src/data-source';

/** The data source of the CLI, pointed at the test database by setup-env.ts. */
export const testDataSource = dataSource;

/**
 * Makes sure the test database exists and is empty: no tables at all,
 * exactly what a freshly created database looks like before the migrations.
 */
export async function emptyTestDatabase(): Promise<void> {
  const env = validate(process.env);
  if (!env.DB_NAME.endsWith('_test')) {
    throw new Error(`Refusing to wipe "${env.DB_NAME}": not a test database`);
  }

  // CREATE DATABASE has to be sent over a connection to another database.
  const server = new DataSource({
    type: 'postgres',
    host: env.DB_HOST,
    port: env.DB_PORT,
    username: env.DB_USER,
    password: env.DB_PASSWORD,
    database: 'postgres',
  });
  await server.initialize();
  try {
    const found: unknown[] = await server.query(
      'SELECT 1 FROM pg_database WHERE datname = $1',
      [env.DB_NAME],
    );
    if (found.length === 0) {
      await server.query(`CREATE DATABASE "${env.DB_NAME}"`);
    }
  } finally {
    await server.destroy();
  }

  await dataSource.initialize();
  try {
    await dataSource.dropDatabase();
  } finally {
    await dataSource.destroy();
  }
}

/** An empty test database with the schema built by the migrations. */
export async function migrateTestDatabase(): Promise<void> {
  await emptyTestDatabase();
  await dataSource.initialize();
  try {
    await dataSource.runMigrations();
  } finally {
    await dataSource.destroy();
  }
}
