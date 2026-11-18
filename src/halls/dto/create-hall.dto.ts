import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsPositive, IsString } from 'class-validator';
import { Trim } from '../../common/trim.transform';

export class CreateHallDto {
  @ApiProperty({ example: 'Red hall', description: 'Unique among all halls' })
  @Trim()
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 3, minimum: 1 })
  @IsInt()
  @IsPositive()
  rows: number;

  @ApiProperty({ example: 5, minimum: 1 })
  @IsInt()
  @IsPositive()
  seatsPerRow: number;
}
