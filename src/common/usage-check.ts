/**
 * Answers whether a record is still referenced by another domain.
 *
 * Films and halls do not know about showings, so the showings module
 * registers a check with them instead. This keeps module dependencies
 * pointing one way and avoids a circular import.
 */
export type UsageCheck = (id: string) => boolean;
