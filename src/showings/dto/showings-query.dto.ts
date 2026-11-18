import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsISO8601,
  IsOptional,
  IsUUID,
  Matches,
  Max,
  Min,
} from 'class-validator';

export enum SortOrder {
  Asc = 'asc',
  Desc = 'desc',
}

export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

/**
 * Query string of `GET /showings`. Every parameter is optional.
 * Query values arrive as strings, so the numbers are converted first.
 */
export class ShowingsQueryDto {
  @ApiPropertyOptional({
    format: 'uuid',
    description: 'Keep only showings of this film',
  })
  @IsOptional()
  @IsUUID()
  filmId?: string;

  @ApiPropertyOptional({
    example: '2030-05-01',
    description: 'Keep only showings that start on this day (UTC), YYYY-MM-DD',
  })
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'date must have the YYYY-MM-DD format',
  })
  @IsISO8601({ strict: true }, { message: 'date must be a real calendar date' })
  date?: string;

  @ApiPropertyOptional({
    type: 'integer',
    minimum: 1,
    default: 1,
    description: 'Page number, starting from 1',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @ApiPropertyOptional({
    type: 'integer',
    minimum: 1,
    maximum: MAX_PAGE_SIZE,
    default: DEFAULT_PAGE_SIZE,
    description: 'Number of showings on a page',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_PAGE_SIZE)
  limit: number = DEFAULT_PAGE_SIZE;

  @ApiPropertyOptional({
    enum: SortOrder,
    default: SortOrder.Asc,
    description:
      'Order by start time. Showings that start together are ordered by id',
  })
  @IsOptional()
  @IsEnum(SortOrder)
  sort: SortOrder = SortOrder.Asc;
}
