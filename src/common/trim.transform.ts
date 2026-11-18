import { Transform } from 'class-transformer';

/**
 * Cleans string input before validation:
 * - trims it, so that whitespace-only values fail `@IsNotEmpty()`;
 * - drops NUL characters, which PostgreSQL text columns cannot store.
 */
export const Trim = () =>
  Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.replaceAll('\0', '').trim() : value,
  );
