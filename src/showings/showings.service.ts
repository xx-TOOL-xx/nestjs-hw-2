import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { isPostgresError, PostgresErrorCode } from '../common/postgres-error';
import { FilmsService } from '../films/films.service';
import { HallsService } from '../halls/halls.service';
import { CreateShowingDto } from './dto/create-showing.dto';
import { ShowingView } from './dto/showing-view.dto';
import { ShowingsQueryDto } from './dto/showings-query.dto';
import { Showing } from './entities/showing.entity';

@Injectable()
export class ShowingsService {
  constructor(
    @InjectRepository(Showing)
    private readonly showingsRepository: Repository<Showing>,
    private readonly filmsService: FilmsService,
    private readonly hallsService: HallsService,
  ) {}

  async create(dto: CreateShowingDto): Promise<Showing> {
    if (!(await this.filmsService.exists(dto.filmId))) {
      throw new BadRequestException(`Film with id ${dto.filmId} not found`);
    }
    if (!(await this.hallsService.exists(dto.hallId))) {
      throw new BadRequestException(`Hall with id ${dto.hallId} not found`);
    }

    const showing = this.showingsRepository.create({
      filmId: dto.filmId,
      hallId: dto.hallId,
      startsAt: new Date(dto.startsAt),
      price: dto.price,
    });
    try {
      return await this.showingsRepository.save(showing);
    } catch (error) {
      // The film or the hall was deleted after the checks above.
      if (isPostgresError(error, PostgresErrorCode.ForeignKeyViolation)) {
        throw new BadRequestException(
          'The film or the hall of the showing no longer exists',
        );
      }
      throw error;
    }
  }

  /** Filtering and sorting are done by the database. */
  async findAll(query: ShowingsQueryDto): Promise<ShowingView[]> {
    const builder = this.showingsRepository
      .createQueryBuilder('showing')
      .innerJoinAndSelect('showing.film', 'film')
      .innerJoinAndSelect('showing.hall', 'hall');

    if (query.filmId !== undefined) {
      builder.andWhere('showing.filmId = :filmId', { filmId: query.filmId });
    }
    if (query.date !== undefined) {
      // "Starts on that day" means the UTC day: [00:00, next day 00:00).
      const dayStart = new Date(`${query.date}T00:00:00.000Z`);
      const nextDayStart = new Date(dayStart);
      nextDayStart.setUTCDate(nextDayStart.getUTCDate() + 1);
      builder
        .andWhere('showing.startsAt >= :dayStart', { dayStart })
        .andWhere('showing.startsAt < :nextDayStart', { nextDayStart });
    }

    const showings = await builder
      .orderBy('showing.startsAt', 'ASC')
      // Showings that start at the same moment keep a stable order.
      .addOrderBy('showing.id', 'ASC')
      .getMany();

    return showings.map((showing) => this.toView(showing));
  }

  async findOne(id: string): Promise<Showing> {
    const showing = await this.showingsRepository.findOneBy({ id });
    if (showing === null) {
      throw new NotFoundException(`Showing with id ${id} not found`);
    }
    return showing;
  }

  async findOneView(id: string): Promise<ShowingView> {
    const showing = await this.showingsRepository.findOne({
      where: { id },
      relations: { film: true, hall: true },
    });
    if (showing === null) {
      throw new NotFoundException(`Showing with id ${id} not found`);
    }
    return this.toView(showing);
  }

  /** Expects a showing loaded together with its film and its hall. */
  private toView(showing: Showing): ShowingView {
    return {
      id: showing.id,
      filmTitle: showing.film!.title,
      hallName: showing.hall!.name,
      startsAt: showing.startsAt.toISOString(),
      price: showing.price,
    };
  }
}
