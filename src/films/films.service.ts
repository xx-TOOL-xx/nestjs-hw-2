import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { isPostgresError, PostgresErrorCode } from '../common/postgres-error';
import { CreateFilmDto } from './dto/create-film.dto';
import { UpdateFilmDto } from './dto/update-film.dto';
import { Film } from './entities/film.entity';

@Injectable()
export class FilmsService {
  constructor(
    @InjectRepository(Film)
    private readonly filmsRepository: Repository<Film>,
  ) {}

  create(dto: CreateFilmDto): Promise<Film> {
    return this.filmsRepository.save(this.filmsRepository.create(dto));
  }

  findAll(): Promise<Film[]> {
    return this.filmsRepository.find({ order: { title: 'ASC', id: 'ASC' } });
  }

  async findOne(id: string): Promise<Film> {
    const film = await this.filmsRepository.findOneBy({ id });
    if (film === null) {
      throw new NotFoundException(`Film with id ${id} not found`);
    }
    return film;
  }

  exists(id: string): Promise<boolean> {
    return this.filmsRepository.existsBy({ id });
  }

  async update(id: string, dto: UpdateFilmDto): Promise<Film> {
    const film = await this.findOne(id);
    return this.filmsRepository.save(this.filmsRepository.merge(film, dto));
  }

  /**
   * The films module does not know about showings. The foreign key
   * `showings.film_id` does: while a showing refers to the film, the database
   * rejects the delete, and that rejection becomes the 409.
   */
  async remove(id: string): Promise<void> {
    let affected: number | null | undefined;
    try {
      ({ affected } = await this.filmsRepository.delete({ id }));
    } catch (error) {
      if (isPostgresError(error, PostgresErrorCode.ForeignKeyViolation)) {
        throw new ConflictException(
          `Film with id ${id} is referenced by at least one showing`,
        );
      }
      throw error;
    }
    if (!affected) {
      throw new NotFoundException(`Film with id ${id} not found`);
    }
  }
}
