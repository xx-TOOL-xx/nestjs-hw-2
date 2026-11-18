import { ApiProperty } from '@nestjs/swagger';
import {
  IsInt,
  IsNotEmpty,
  IsPositive,
  IsString,
  Max,
  MaxLength,
} from 'class-validator';
import { MAX_INTEGER, MAX_NAME_LENGTH } from '../../common/column-limits';
import { Trim } from '../../common/trim.transform';

export class CreateHallDto {
  @ApiProperty({
    example: 'Red hall',
    maxLength: MAX_NAME_LENGTH,
    description: 'Unique among all halls',
  })
  @Trim()
  @IsString()
  @IsNotEmpty()
  @MaxLength(MAX_NAME_LENGTH)
  name: string;

  @ApiProperty({ example: 3, minimum: 1 })
  @IsInt()
  @IsPositive()
  @Max(MAX_INTEGER)
  rows: number;

  @ApiProperty({ example: 5, minimum: 1 })
  @IsInt()
  @IsPositive()
  @Max(MAX_INTEGER)
  seatsPerRow: number;
}
