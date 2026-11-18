import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsPositive, IsString, Min } from 'class-validator';
import { Trim } from '../../common/trim.transform';

export class CreateFilmDto {
  @ApiProperty({ example: 'Dune: Part Two' })
  @Trim()
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ example: 166, minimum: 1, description: 'Length in minutes' })
  @IsInt()
  @IsPositive()
  durationMinutes: number;

  @ApiProperty({ example: 2024, minimum: 1888 })
  @IsInt()
  @Min(1888)
  releaseYear: number;
}
