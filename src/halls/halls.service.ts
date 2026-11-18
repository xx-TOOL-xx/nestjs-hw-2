import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { isPostgresError, PostgresErrorCode } from '../common/postgres-error';
import { CreateHallDto } from './dto/create-hall.dto';
import { HallWithSeats } from './dto/hall-with-seats.dto';
import { Seat } from './dto/seat.dto';
import { Hall } from './entities/hall.entity';

@Injectable()
export class HallsService {
  constructor(
    @InjectRepository(Hall)
    private readonly hallsRepository: Repository<Hall>,
  ) {}

  /** The unique constraint on `halls.name` decides whether the name is free. */
  async create(dto: CreateHallDto): Promise<Hall> {
    try {
      return await this.hallsRepository.save(this.hallsRepository.create(dto));
    } catch (error) {
      if (isPostgresError(error, PostgresErrorCode.UniqueViolation)) {
        throw new ConflictException(`Hall named "${dto.name}" already exists`);
      }
      throw error;
    }
  }

  findAll(): Promise<Hall[]> {
    return this.hallsRepository.find({ order: { name: 'ASC' } });
  }

  async findOne(id: string): Promise<Hall> {
    const hall = await this.hallsRepository.findOneBy({ id });
    if (hall === null) {
      throw new NotFoundException(`Hall with id ${id} not found`);
    }
    return hall;
  }

  async findOneWithSeats(id: string): Promise<HallWithSeats> {
    const hall = await this.findOne(id);
    return { ...hall, seats: this.listSeats(hall) };
  }

  exists(id: string): Promise<boolean> {
    return this.hallsRepository.existsBy({ id });
  }

  /** Row by row, seat by seat: a 3 x 5 hall yields 15 seats. */
  listSeats(hall: Pick<Hall, 'rows' | 'seatsPerRow'>): Seat[] {
    const seats: Seat[] = [];
    for (let row = 1; row <= hall.rows; row += 1) {
      for (let seat = 1; seat <= hall.seatsPerRow; seat += 1) {
        seats.push({ row, seat });
      }
    }
    return seats;
  }

  /**
   * The halls module does not know about showings. The foreign key
   * `showings.hall_id` does: while a showing refers to the hall, the database
   * rejects the delete, and that rejection becomes the 409.
   */
  async remove(id: string): Promise<void> {
    let affected: number | null | undefined;
    try {
      ({ affected } = await this.hallsRepository.delete({ id }));
    } catch (error) {
      if (isPostgresError(error, PostgresErrorCode.ForeignKeyViolation)) {
        throw new ConflictException(
          `Hall with id ${id} is referenced by at least one showing`,
        );
      }
      throw error;
    }
    if (!affected) {
      throw new NotFoundException(`Hall with id ${id} not found`);
    }
  }
}
