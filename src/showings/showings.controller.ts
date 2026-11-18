import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { ErrorResponse } from '../common/dto/error-response.dto';
import { CreateShowingDto } from './dto/create-showing.dto';
import { PaginatedShowings } from './dto/paginated-showings.dto';
import { ShowingView } from './dto/showing-view.dto';
import { ShowingsQueryDto } from './dto/showings-query.dto';
import { Showing } from './entities/showing.entity';
import { ShowingsService } from './showings.service';

@ApiTags('showings')
@Controller('showings')
export class ShowingsController {
  constructor(private readonly showingsService: ShowingsService) {}

  @Post()
  @ApiOperation({ summary: 'Schedule a film in a hall' })
  @ApiCreatedResponse({ type: Showing })
  @ApiBadRequestResponse({
    type: ErrorResponse,
    description:
      'The film or the hall does not exist, startsAt is not a valid ISO 8601 date or is in the past, or price is not a positive integer',
  })
  create(@Body() dto: CreateShowingDto): Promise<Showing> {
    return this.showingsService.create(dto);
  }

  @Get()
  @ApiOperation({
    summary: 'List showings page by page',
    description:
      'Filters by film and by day, orders by start time and returns one page. Every query parameter is optional.',
  })
  @ApiOkResponse({ type: PaginatedShowings })
  @ApiBadRequestResponse({
    type: ErrorResponse,
    description:
      'page or limit is not an integer or is out of range, sort is neither asc nor desc, date is not in YYYY-MM-DD format, or filmId is not a UUID',
  })
  findAll(@Query() query: ShowingsQueryDto): Promise<PaginatedShowings> {
    return this.showingsService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get one showing' })
  @ApiOkResponse({ type: ShowingView })
  @ApiBadRequestResponse({
    type: ErrorResponse,
    description: 'The id is not a UUID',
  })
  @ApiNotFoundResponse({
    type: ErrorResponse,
    description: 'Showing not found',
  })
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<ShowingView> {
    return this.showingsService.findOneView(id);
  }
}
