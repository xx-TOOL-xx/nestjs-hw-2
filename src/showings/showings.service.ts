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
import { PaginatedShowings } from './dto/paginated-showings.dto';
import { ShowingView } from './dto/showing-view.dto';
import { ShowingsQueryDto, SortOrder } from './dto/showings-query.dto';
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

  /**
   * Filtering, sorting and paging are all done by the database: the query
   * returns one page of rows and the number of rows that match the filters.
   */
  async findAll(query: ShowingsQueryDto): Promise<PaginatedShowings> {
    const { page, limit } = query;
    // A page far beyond the data is still a valid request with no items;
    // the cap keeps the offset within what PostgreSQL accepts.
    const offset = Math.min((page - 1) * limit, Number.MAX_SAFE_INTEGER);
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

    const [showings, total] = await builder
      .orderBy(
        'showing.startsAt',
        query.sort === SortOrder.Desc ? 'DESC' : 'ASC',
      )
      // Showings that start at the same moment keep a stable order.
      .addOrderBy('showing.id', 'ASC')
      .skip(offset)
      .take(limit)
      .getManyAndCount();

    return {
      items: showings.map((showing) => this.toView(showing)),
      total,
      page,
      limit,
    };
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
