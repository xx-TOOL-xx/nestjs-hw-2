import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { UsageCheck } from '../common/usage-check';
import { CreateFilmDto } from './dto/create-film.dto';
import { UpdateFilmDto } from './dto/update-film.dto';
import { Film } from './entities/film.entity';

@Injectable()
export class FilmsService {
  private readonly films: Film[] = [];
  private readonly usageChecks: UsageCheck[] = [];

  create(dto: CreateFilmDto): Film {
    const film: Film = { id: randomUUID(), ...dto };
    this.films.push(film);
    return film;
  }

  findAll(): Film[] {
    return [...this.films];
  }

  findOne(id: string): Film {
    const film = this.films.find((item) => item.id === id);
    if (!film) {
      throw new NotFoundException(`Film with id ${id} not found`);
    }
    return film;
  }

  exists(id: string): boolean {
    return this.films.some((item) => item.id === id);
  }

  update(id: string, dto: UpdateFilmDto): Film {
    const film = this.findOne(id);
    Object.assign(film, dto);
    return film;
  }

  remove(id: string): void {
    const film = this.findOne(id);
    if (this.usageChecks.some((isUsed) => isUsed(id))) {
      throw new ConflictException(
        `Film with id ${id} is referenced by at least one showing`,
      );
    }
    this.films.splice(this.films.indexOf(film), 1);
  }

  /** Lets a dependent module veto deletion of a film it still refers to. */
  registerUsageCheck(check: UsageCheck): void {
    this.usageChecks.push(check);
  }
}
