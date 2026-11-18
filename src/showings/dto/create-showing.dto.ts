import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsISO8601, IsPositive, IsUUID, Max } from 'class-validator';
import { MAX_INTEGER } from '../../common/column-limits';
import { IsFutureDate } from '../validators/is-future-date.validator';

export class CreateShowingDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  filmId: string;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  hallId: string;

  @ApiProperty({
    example: '2030-05-01T18:30:00.000Z',
    description: 'Start time, ISO 8601, must not be in the past',
  })
  @IsISO8601({ strict: true })
  @IsFutureDate()
  startsAt: string;

  @ApiProperty({
    example: 12500,
    minimum: 1,
    description: 'Price of one ticket in the smallest currency unit',
  })
  @IsInt()
  @IsPositive()
  @Max(MAX_INTEGER)
  price: number;
}
