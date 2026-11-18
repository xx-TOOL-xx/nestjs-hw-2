import {
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { ErrorResponse } from '../common/dto/error-response.dto';
import { BookingsService } from './bookings.service';
import { BookingView } from './dto/booking-view.dto';

@ApiTags('bookings')
@Controller('bookings')
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  @Get()
  @ApiOperation({ summary: 'List all bookings of the service' })
  @ApiOkResponse({ type: [BookingView] })
  findAll(): Promise<BookingView[]> {
    return this.bookingsService.findAll();
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Cancel a booking and free its seats' })
  @ApiNoContentResponse({ description: 'Booking cancelled' })
  @ApiBadRequestResponse({
    type: ErrorResponse,
    description: 'The id is not a UUID',
  })
  @ApiNotFoundResponse({
    type: ErrorResponse,
    description: 'Booking not found',
  })
  remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.bookingsService.remove(id);
  }
}
