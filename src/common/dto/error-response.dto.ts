import { ApiProperty } from '@nestjs/swagger';

/** The body of every error response, built by `GlobalExceptionFilter`. */
export class ErrorResponse {
  @ApiProperty({ example: 404 })
  statusCode: number;

  @ApiProperty({
    oneOf: [{ type: 'string' }, { type: 'array', items: { type: 'string' } }],
    example: 'Film with id 3fa85f64-5717-4562-b3fc-2c963f66afa6 not found',
    description:
      'What went wrong. Validation errors come as a list, one entry per broken rule',
  })
  message: string | string[];

  @ApiProperty({ example: 'Not Found', description: 'Name of the status code' })
  error: string;

  @ApiProperty({
    example: '/films/3fa85f64-5717-4562-b3fc-2c963f66afa6',
    description: 'Path of the request that failed',
  })
  path: string;

  @ApiProperty({ example: '2030-05-01T18:30:00.000Z' })
  timestamp: string;
}
