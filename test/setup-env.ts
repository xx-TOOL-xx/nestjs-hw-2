import 'dotenv/config';

/**
 * Runs before every e2e test file, ahead of any application code.
 *
 * The tests get a database of their own, `<DB_NAME>_test` on the same
 * server, so they can wipe it freely without touching development data.
 */
if (process.env.DB_NAME) {
  process.env.DB_NAME = `${process.env.DB_NAME}_test`;
}
