import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { BookingsModule } from './bookings/bookings.module';
import { validate } from './config/environment-variables';
import { FilmsModule } from './films/films.module';
import { HallsModule } from './halls/halls.module';
import { ShowingsModule } from './showings/showings.module';

@Module({
  imports: [
    // Reads .env and refuses to start if a variable is missing or malformed.
    ConfigModule.forRoot({ isGlobal: true, validate }),
    FilmsModule,
    HallsModule,
    ShowingsModule,
    BookingsModule,
  ],
})
export class AppModule {}
