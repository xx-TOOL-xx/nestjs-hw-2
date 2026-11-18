import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { ErrorResponse } from '../common/dto/error-response.dto';
import { CreateHallDto } from './dto/create-hall.dto';
import { Hall, HallWithSeats } from './entities/hall.entity';
import { HallsService } from './halls.service';

@ApiTags('halls')
@Controller('halls')
export class HallsController {
  constructor(private readonly hallsService: HallsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a hall' })
  @ApiCreatedResponse({ type: Hall })
  @ApiBadRequestResponse({
    type: ErrorResponse,
    description:
      'A field is missing, has a wrong type, or a number is not a positive integer',
  })
  @ApiConflictResponse({
    type: ErrorResponse,
    description: 'A hall with this name already exists',
  })
  create(@Body() dto: CreateHallDto): Hall {
    return this.hallsService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List all halls' })
  @ApiOkResponse({ type: [Hall] })
  findAll(): Hall[] {
    return this.hallsService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get one hall together with its seats' })
  @ApiOkResponse({ type: HallWithSeats })
  @ApiBadRequestResponse({
    type: ErrorResponse,
    description: 'The id is not a UUID',
  })
  @ApiNotFoundResponse({ type: ErrorResponse, description: 'Hall not found' })
  findOne(@Param('id', ParseUUIDPipe) id: string): HallWithSeats {
    return this.hallsService.findOneWithSeats(id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a hall' })
  @ApiNoContentResponse({ description: 'Hall deleted' })
  @ApiBadRequestResponse({
    type: ErrorResponse,
    description: 'The id is not a UUID',
  })
  @ApiNotFoundResponse({ type: ErrorResponse, description: 'Hall not found' })
  @ApiConflictResponse({
    type: ErrorResponse,
    description: 'At least one showing uses the hall',
  })
  remove(@Param('id', ParseUUIDPipe) id: string): void {
    this.hallsService.remove(id);
  }
}
