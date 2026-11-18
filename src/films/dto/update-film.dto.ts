import { PartialType } from '@nestjs/swagger';
import { CreateFilmDto } from './create-film.dto';

/**
 * Every field is optional, but a field that is present is validated even
 * when it is `null`: the columns are NOT NULL, so `null` is a wrong type.
 */
export class UpdateFilmDto extends PartialType(CreateFilmDto, {
  skipNullProperties: false,
}) {}
