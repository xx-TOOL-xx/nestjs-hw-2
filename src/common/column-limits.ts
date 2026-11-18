/**
 * Limits of the PostgreSQL column types. DTOs check them so that a value the
 * database cannot store is answered with 400 instead of a failed query.
 */

/** Largest value of an `integer` column. */
export const MAX_INTEGER = 2_147_483_647;

/** Length of the `varchar(255)` columns that hold titles and names. */
export const MAX_NAME_LENGTH = 255;
