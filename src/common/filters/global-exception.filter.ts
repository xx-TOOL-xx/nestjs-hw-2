import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { STATUS_CODES } from 'node:http';
import { ErrorResponse } from '../dto/error-response.dto';

const INTERNAL_ERROR_MESSAGE = 'Internal server error';

/** Errors of Express middleware (body parser) carry their own status code. */
type MiddlewareHttpError = { statusCode: number; message: string };

const isMiddlewareHttpError = (
  exception: unknown,
): exception is MiddlewareHttpError => {
  const { statusCode, message } = (exception ?? {}) as Record<string, unknown>;
  return (
    typeof statusCode === 'number' &&
    statusCode >= 400 &&
    statusCode < 500 &&
    typeof message === 'string'
  );
};

/**
 * Gives every error response one structure: status code, message and the
 * path of the request.
 *
 * HTTP exceptions keep their status and message. Anything else is an
 * unexpected failure: it is logged and answered with a generic 500, so
 * internal details such as database error texts never reach the client.
 */
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const { statusCode, message } = this.describe(exception);

    if (statusCode >= 500) {
      this.logger.error(
        `${request.method} ${request.url} -> ${statusCode}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    }

    const body: ErrorResponse = {
      statusCode,
      message,
      error: STATUS_CODES[statusCode] ?? 'Error',
      path: request.url,
      timestamp: new Date().toISOString(),
    };
    response.status(statusCode).json(body);
  }

  private describe(
    exception: unknown,
  ): Pick<ErrorResponse, 'statusCode' | 'message'> {
    if (exception instanceof HttpException) {
      const exceptionResponse = exception.getResponse();
      // ValidationPipe puts a list here: one message per broken rule.
      const message =
        typeof exceptionResponse === 'string'
          ? exceptionResponse
          : ((exceptionResponse as { message?: string | string[] }).message ??
            exception.message);
      return { statusCode: exception.getStatus(), message };
    }

    if (isMiddlewareHttpError(exception)) {
      return { statusCode: exception.statusCode, message: exception.message };
    }

    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: INTERNAL_ERROR_MESSAGE,
    };
  }
}
