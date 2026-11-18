import { ApiProperty } from '@nestjs/swagger';
import { Seat } from '../../halls/dto/seat.dto';

export class SeatStatus extends Seat {
  @ApiProperty({ description: 'Whether the seat is taken on this showing' })
  isBooked: boolean;
}
