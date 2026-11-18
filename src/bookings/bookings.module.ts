import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HallsModule } from '../halls/halls.module';
import { ShowingsModule } from '../showings/showings.module';
import { BookingsController } from './bookings.controller';
import { BookingsService } from './bookings.service';
import { BookingSeat } from './entities/booking-seat.entity';
import { Booking } from './entities/booking.entity';
import { ShowingBookingsController } from './showing-bookings.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([Booking, BookingSeat]),
    ShowingsModule,
    HallsModule,
  ],
  controllers: [BookingsController, ShowingBookingsController],
  providers: [BookingsService],
})
export class BookingsModule {}
