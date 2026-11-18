import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { UsageCheck } from '../common/usage-check';
import { CreateHallDto } from './dto/create-hall.dto';
import { Hall, HallWithSeats } from './entities/hall.entity';
import { Seat } from './entities/seat.entity';

@Injectable()
export class HallsService {
  private readonly halls: Hall[] = [];
  private readonly usageChecks: UsageCheck[] = [];

  create(dto: CreateHallDto): Hall {
    if (this.halls.some((item) => item.name === dto.name)) {
      throw new ConflictException(`Hall named "${dto.name}" already exists`);
    }
    const hall: Hall = { id: randomUUID(), ...dto };
    this.halls.push(hall);
    return hall;
  }

  findAll(): Hall[] {
    return [...this.halls];
  }

  findOne(id: string): Hall {
    const hall = this.halls.find((item) => item.id === id);
    if (!hall) {
      throw new NotFoundException(`Hall with id ${id} not found`);
    }
    return hall;
  }

  findOneWithSeats(id: string): HallWithSeats {
    const hall = this.findOne(id);
    return { ...hall, seats: this.listSeats(hall) };
  }

  exists(id: string): boolean {
    return this.halls.some((item) => item.id === id);
  }

  /** Row by row, seat by seat: a 3 x 5 hall yields 15 seats. */
  listSeats(hall: Hall): Seat[] {
    const seats: Seat[] = [];
    for (let row = 1; row <= hall.rows; row += 1) {
      for (let seat = 1; seat <= hall.seatsPerRow; seat += 1) {
        seats.push({ row, seat });
      }
    }
    return seats;
  }

  remove(id: string): void {
    const hall = this.findOne(id);
    if (this.usageChecks.some((isUsed) => isUsed(id))) {
      throw new ConflictException(
        `Hall with id ${id} is referenced by at least one showing`,
      );
    }
    this.halls.splice(this.halls.indexOf(hall), 1);
  }

  /** Lets a dependent module veto deletion of a hall it still refers to. */
  registerUsageCheck(check: UsageCheck): void {
    this.usageChecks.push(check);
  }
}
