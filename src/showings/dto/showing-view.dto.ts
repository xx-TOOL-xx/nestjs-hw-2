import { ApiProperty } from '@nestjs/swagger';

/** A showing as clients read it: names instead of identifiers. */
export class ShowingView {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ example: 'Dune: Part Two' })
  filmTitle: string;

  @ApiProperty({ example: 'Red hall' })
  hallName: string;

  @ApiProperty({ example: '2030-05-01T18:30:00.000Z' })
  startsAt: string;

  @ApiProperty({
    example: 12500,
    description: 'Price of one ticket in the smallest currency unit',
  })
  price: number;
}
