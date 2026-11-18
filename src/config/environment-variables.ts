import { plainToInstance } from 'class-transformer';
import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  Min,
  validateSync,
} from 'class-validator';

/**
 * Every environment variable the application reads.
 * Described with the same class-validator decorators as the DTOs.
 */
export class EnvironmentVariables {
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(65535)
  PORT: number = 3000;

  @IsString()
  @IsNotEmpty()
  DB_HOST: string;

  @IsInt()
  @Min(1)
  @Max(65535)
  DB_PORT: number;

  @IsString()
  @IsNotEmpty()
  DB_USER: string;

  @IsString()
  @IsNotEmpty()
  DB_PASSWORD: string;

  @IsString()
  @IsNotEmpty()
  DB_NAME: string;
}

/**
 * Called by `ConfigModule` on startup. Throwing here stops the application
 * before it listens, so a missing or malformed variable is reported at once.
 */
export function validate(
  config: Record<string, unknown>,
): EnvironmentVariables {
  const validatedConfig = plainToInstance(EnvironmentVariables, config, {
    // Environment values are strings; this turns "5432" into 5432.
    enableImplicitConversion: true,
  });

  const errors = validateSync(validatedConfig);

  if (errors.length > 0) {
    throw new Error(errors.toString());
  }

  return validatedConfig;
}
