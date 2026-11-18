import { QueryFailedError } from 'typeorm';

/** SQLSTATE codes of the constraint violations the services react to. */
export enum PostgresErrorCode {
  /** A row is still referenced, or refers to a row that does not exist. */
  ForeignKeyViolation = '23503',
  /** A unique index or constraint already holds the same value. */
  UniqueViolation = '23505',
}

/**
 * TypeORM wraps a driver failure in `QueryFailedError` and keeps the original
 * error, with the SQLSTATE code set by PostgreSQL, in `driverError`.
 */
export function isPostgresError(
  error: unknown,
  code: PostgresErrorCode,
): error is QueryFailedError {
  return (
    error instanceof QueryFailedError &&
    (error.driverError as { code?: string }).code === code
  );
}
