import { Module } from '@nestjs/common';
import { BookingsModule } from './bookings/bookings.module';
import { FilmsModule } from './films/films.module';
import { HallsModule } from './halls/halls.module';
import { ShowingsModule } from './showings/showings.module';

@Module({
  imports: [FilmsModule, HallsModule, ShowingsModule, BookingsModule],
})
export class AppModule {}
