import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
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
import { CreateFilmDto } from './dto/create-film.dto';
import { UpdateFilmDto } from './dto/update-film.dto';
import { Film } from './entities/film.entity';
import { FilmsService } from './films.service';

@ApiTags('films')
@Controller('films')
export class FilmsController {
  constructor(private readonly filmsService: FilmsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a film' })
  @ApiCreatedResponse({ type: Film })
  @ApiBadRequestResponse({
    type: ErrorResponse,
    description: 'A field is missing or has a wrong type',
  })
  create(@Body() dto: CreateFilmDto): Promise<Film> {
    return this.filmsService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List all films' })
  @ApiOkResponse({ type: [Film] })
  findAll(): Promise<Film[]> {
    return this.filmsService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get one film' })
  @ApiOkResponse({ type: Film })
  @ApiBadRequestResponse({
    type: ErrorResponse,
    description: 'The id is not a UUID',
  })
  @ApiNotFoundResponse({ type: ErrorResponse, description: 'Film not found' })
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<Film> {
    return this.filmsService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update any subset of film fields' })
  @ApiOkResponse({ type: Film })
  @ApiBadRequestResponse({
    type: ErrorResponse,
    description: 'A field has a wrong type',
  })
  @ApiNotFoundResponse({ type: ErrorResponse, description: 'Film not found' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateFilmDto,
  ): Promise<Film> {
    return this.filmsService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a film' })
  @ApiNoContentResponse({ description: 'Film deleted' })
  @ApiBadRequestResponse({
    type: ErrorResponse,
    description: 'The id is not a UUID',
  })
  @ApiNotFoundResponse({ type: ErrorResponse, description: 'Film not found' })
  @ApiConflictResponse({
    type: ErrorResponse,
    description: 'At least one showing uses the film',
  })
  remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.filmsService.remove(id);
  }
}
