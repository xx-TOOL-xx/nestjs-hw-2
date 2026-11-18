import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { ErrorResponse } from '../common/dto/error-response.dto';
import { BookingsService } from './bookings.service';
import { BookingView } from './dto/booking-view.dto';
import { CreateBookingDto } from './dto/create-booking.dto';
import { SeatStatus } from './dto/seat-status.dto';

/** Booking routes that are addressed through the showing they belong to. */
@ApiTags('bookings')
@Controller('showings/:id')
export class ShowingBookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  @Get('seats')
  @ApiOperation({ summary: 'List the seats of a showing with their status' })
  @ApiOkResponse({ type: [SeatStatus] })
  @ApiBadRequestResponse({
    type: ErrorResponse,
    description: 'The id is not a UUID',
  })
  @ApiNotFoundResponse({
    type: ErrorResponse,
    description: 'Showing not found',
  })
  seatMap(@Param('id', ParseUUIDPipe) id: string): Promise<SeatStatus[]> {
    return this.bookingsService.seatMap(id);
  }

  @Post('bookings')
  @ApiOperation({ summary: 'Book seats on a showing' })
  @ApiCreatedResponse({ type: BookingView })
  @ApiBadRequestResponse({
    type: ErrorResponse,
    description:
      'seats is empty, an element lacks row or seat, a seat is listed twice, or a seat does not exist in the hall',
  })
  @ApiNotFoundResponse({
    type: ErrorResponse,
    description: 'Showing not found',
  })
  @ApiConflictResponse({
    type: ErrorResponse,
    description: 'At least one seat is already booked; nothing is booked',
  })
  create(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateBookingDto,
  ): Promise<BookingView> {
    return this.bookingsService.create(id, dto);
  }

  @Get('bookings')
  @ApiOperation({ summary: 'List the bookings of a showing' })
  @ApiOkResponse({ type: [BookingView] })
  @ApiBadRequestResponse({
    type: ErrorResponse,
    description: 'The id is not a UUID',
  })
  @ApiNotFoundResponse({
    type: ErrorResponse,
    description: 'Showing not found',
  })
  findByShowing(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<BookingView[]> {
    return this.bookingsService.findByShowing(id);
  }
}
