import { ApiProperty } from '@nestjs/swagger';
import {
  IsInt,
  IsNotEmpty,
  IsPositive,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { MAX_INTEGER, MAX_NAME_LENGTH } from '../../common/column-limits';
import { Trim } from '../../common/trim.transform';

export class CreateFilmDto {
  @ApiProperty({ example: 'Dune: Part Two', maxLength: MAX_NAME_LENGTH })
  @Trim()
  @IsString()
  @IsNotEmpty()
  @MaxLength(MAX_NAME_LENGTH)
  title: string;

  @ApiProperty({ example: 166, minimum: 1, description: 'Length in minutes' })
  @IsInt()
  @IsPositive()
  @Max(MAX_INTEGER)
  durationMinutes: number;

  @ApiProperty({ example: 2024, minimum: 1888 })
  @IsInt()
  @Min(1888)
  @Max(MAX_INTEGER)
  releaseYear: number;
}
