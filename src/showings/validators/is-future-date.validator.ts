import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
} from 'class-validator';

/**
 * Rejects a date string that points to a moment in the past.
 * Unparseable values pass here on purpose: `@IsISO8601()` reports those.
 */
export function IsFutureDate(validationOptions?: ValidationOptions) {
  return (object: object, propertyName: string) => {
    registerDecorator({
      name: 'isFutureDate',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(value: unknown): boolean {
          if (typeof value !== 'string') {
            return true;
          }
          const time = Date.parse(value);
          return Number.isNaN(time) || time > Date.now();
        },
        defaultMessage(args: ValidationArguments): string {
          return `${args.property} must not be in the past`;
        },
      },
    });
  };
}
