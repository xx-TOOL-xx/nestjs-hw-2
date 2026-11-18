import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsISO8601, IsOptional, IsUUID, Matches } from 'class-validator';

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
}
