import {
  ArgumentsHost,
  BadRequestException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { GlobalExceptionFilter } from './global-exception.filter';

describe('GlobalExceptionFilter', () => {
  const filter = new GlobalExceptionFilter();

  const run = (exception: unknown, url = '/films/42') => {
    const json = jest.fn();
    const status = jest.fn().mockReturnValue({ json });
    const host = {
      switchToHttp: () => ({
        getResponse: () => ({ status }),
        getRequest: () => ({ method: 'GET', url }),
      }),
    } as unknown as ArgumentsHost;

    filter.catch(exception, host);

    return { status: status.mock.calls[0][0], body: json.mock.calls[0][0] };
  };

  beforeAll(() => {
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  it('keeps the status and the message of an HTTP exception', () => {
    const { status, body } = run(new NotFoundException('Film not found'));

    expect(status).toBe(404);
    expect(body).toEqual({
      statusCode: 404,
      message: 'Film not found',
      error: 'Not Found',
      path: '/films/42',
      timestamp: expect.any(String),
    });
  });

  it('keeps the list of validation messages', () => {
    const { body } = run(
      new BadRequestException(['title must be a string', 'price is required']),
      '/films',
    );

    expect(body).toMatchObject({
      statusCode: 400,
      message: ['title must be a string', 'price is required'],
      error: 'Bad Request',
      path: '/films',
    });
  });

  it('hides the details of an unexpected error behind a generic 500', () => {
    const { status, body } = run(
      new Error('duplicate key value violates unique constraint "UQ_1"'),
    );

    expect(status).toBe(500);
    expect(body).toMatchObject({
      statusCode: 500,
      message: 'Internal server error',
      error: 'Internal Server Error',
      path: '/films/42',
    });
    expect(JSON.stringify(body)).not.toContain('duplicate key');
  });

  it('keeps the status of a client error raised by Express middleware', () => {
    const tooLarge = Object.assign(new Error('request entity too large'), {
      statusCode: 413,
    });

    expect(run(tooLarge).body).toMatchObject({
      statusCode: 413,
      message: 'request entity too large',
      error: 'Payload Too Large',
    });
  });
});
