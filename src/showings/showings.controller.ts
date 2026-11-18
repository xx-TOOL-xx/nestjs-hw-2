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
  create(@Body() dto: CreateShowingDto): Showing {
    return this.showingsService.create(dto);
  }

  @Get()
  @ApiOperation({
    summary: 'List showings ordered by start time, optionally filtered',
  })
  @ApiOkResponse({ type: [ShowingView] })
  @ApiBadRequestResponse({
    type: ErrorResponse,
    description: 'date is not in YYYY-MM-DD format',
  })
  findAll(@Query() query: ShowingsQueryDto): ShowingView[] {
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
  findOne(@Param('id', ParseUUIDPipe) id: string): ShowingView {
    return this.showingsService.findOneView(id);
  }
}
