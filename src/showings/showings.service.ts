import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { FilmsService } from '../films/films.service';
import { HallsService } from '../halls/halls.service';
import { CreateShowingDto } from './dto/create-showing.dto';
import { ShowingView } from './dto/showing-view.dto';
import { ShowingsQueryDto } from './dto/showings-query.dto';
import { Showing } from './entities/showing.entity';

@Injectable()
export class ShowingsService {
  private readonly showings: Showing[] = [];

  constructor(
    private readonly filmsService: FilmsService,
    private readonly hallsService: HallsService,
  ) {
    // A film or a hall cannot be deleted while a showing refers to it.
    this.filmsService.registerUsageCheck((filmId) =>
      this.showings.some((showing) => showing.filmId === filmId),
    );
    this.hallsService.registerUsageCheck((hallId) =>
      this.showings.some((showing) => showing.hallId === hallId),
    );
  }

  create(dto: CreateShowingDto): Showing {
    if (!this.filmsService.exists(dto.filmId)) {
      throw new BadRequestException(`Film with id ${dto.filmId} not found`);
    }
    if (!this.hallsService.exists(dto.hallId)) {
      throw new BadRequestException(`Hall with id ${dto.hallId} not found`);
    }

    const showing: Showing = {
      id: randomUUID(),
      filmId: dto.filmId,
      hallId: dto.hallId,
      startsAt: new Date(dto.startsAt).toISOString(),
      price: dto.price,
    };
    this.showings.push(showing);
    return showing;
  }

  findAll(query: ShowingsQueryDto = {}): ShowingView[] {
    return this.showings
      .filter((showing) => !query.filmId || showing.filmId === query.filmId)
      .filter(
        (showing) => !query.date || showing.startsAt.startsWith(query.date),
      )
      .sort(
        (a, b) =>
          a.startsAt.localeCompare(b.startsAt) || a.id.localeCompare(b.id),
      )
      .map((showing) => this.toView(showing));
  }

  findOne(id: string): Showing {
    const showing = this.showings.find((item) => item.id === id);
    if (!showing) {
      throw new NotFoundException(`Showing with id ${id} not found`);
    }
    return showing;
  }

  findOneView(id: string): ShowingView {
    return this.toView(this.findOne(id));
  }

  private toView(showing: Showing): ShowingView {
    return {
      id: showing.id,
      filmTitle: this.filmsService.findOne(showing.filmId).title,
      hallName: this.hallsService.findOne(showing.hallId).name,
      startsAt: showing.startsAt,
      price: showing.price,
    };
  }
}
