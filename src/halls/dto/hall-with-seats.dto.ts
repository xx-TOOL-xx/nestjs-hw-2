import { ApiProperty } from '@nestjs/swagger';
import { Hall } from '../entities/hall.entity';
import { Seat } from './seat.dto';

export class HallWithSeats extends Hall {
  @ApiProperty({
    type: [Seat],
    description: 'Every seat of the hall, computed from rows and seatsPerRow',
  })
  seats: Seat[];
}
