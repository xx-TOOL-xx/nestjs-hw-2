import { ApiProperty } from '@nestjs/swagger';
import { ShowingView } from './showing-view.dto';

/** One page of `GET /showings`. */
export class PaginatedShowings {
  @ApiProperty({
    type: [ShowingView],
    description: 'Showings of the current page',
  })
  items: ShowingView[];

  @ApiProperty({
    type: 'integer',
    example: 42,
    description: 'Number of showings that match the filters, on all pages',
  })
  total: number;

  @ApiProperty({
    type: 'integer',
    example: 1,
    description: 'Number of the current page',
  })
  page: number;

  @ApiProperty({ type: 'integer', example: 20, description: 'Page size' })
  limit: number;
}
