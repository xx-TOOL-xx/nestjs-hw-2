import { ApiProperty } from '@nestjs/swagger';

/** A seat has no identity of its own: it is the pair of row and seat number. */
export class Seat {
  @ApiProperty({ example: 1, minimum: 1 })
  row: number;

  @ApiProperty({ example: 3, minimum: 1 })
  seat: number;
}
