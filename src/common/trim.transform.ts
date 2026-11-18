import { Transform } from 'class-transformer';

/** Trims string input so that whitespace-only values fail `@IsNotEmpty()`. */
export const Trim = () =>
  Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  );
