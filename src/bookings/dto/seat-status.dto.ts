import { ApiProperty } from '@nestjs/swagger';
import { Seat } from '../../halls/entities/seat.entity';

export class SeatStatus extends Seat {
  @ApiProperty({ description: 'Whether the seat is taken on this showing' })
  isBooked: boolean;
}
