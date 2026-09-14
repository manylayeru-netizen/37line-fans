import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus, Logger } from '@nestjs/common';
import type { Response } from 'express';
import { BusinessException } from '../interfaces/exception.interface';
import { HTTP_STATUS_TO_RESPONSE_CODE_MAP, ResponseCode } from '../constants/api_response_code';
import { ApiErrorResponse } from '../interfaces/api_response.interface';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger('GlobalExceptionFilter');

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    if (response.headersSent) {
      return;
    }

    const method = (request as { method?: string }).method || 'UNKNOWN';
    const url = (request as { url?: string }).url || 'UNKNOWN';

    let errorResponse: Omit<ApiErrorResponse, 'httpStatus'>;
    let httpStatus: HttpStatus;

    if (exception instanceof BusinessException) {
      httpStatus = exception.httpStatus;
      errorResponse = {
        error: {
          code: exception.code,
          message: exception.message,
          details: exception.details,
          fieldErrors: exception.fieldErrors,
          timestamp: Date.now(),
        },
      };
      this.logger.warn(`[${method}] ${url} -> ${httpStatus} ${exception.message}`);
    } else if (exception instanceof HttpException) {
      httpStatus = exception.getStatus() as HttpStatus;
      const exceptionResponse = exception.getResponse();

      errorResponse = {
        error: {
          code: HTTP_STATUS_TO_RESPONSE_CODE_MAP[httpStatus],
          message: typeof exceptionResponse === 'string' ? exceptionResponse : exception.message,
          details: typeof exceptionResponse === 'object' ? JSON.stringify(exceptionResponse) : undefined,
          timestamp: Date.now(),
        },
      };
      this.logger.warn(`[${method}] ${url} -> ${httpStatus} ${exception.message}`);
    } else if (
      typeof exception === 'object' &&
      exception !== null &&
      (exception as { code?: unknown }).code === '22P02'
    ) {
      httpStatus = HttpStatus.NOT_FOUND;
      errorResponse = {
        error: {
          code: ResponseCode.NOT_FOUND,
          message: '资源不存在',
          timestamp: Date.now(),
        },
      };
      this.logger.warn(`[${method}] ${url} -> 404 (PG 22P02 invalid_text_representation)`);
    } else {
      httpStatus = HttpStatus.INTERNAL_SERVER_ERROR;
      const errorMessage =
        exception instanceof Error
          ? exception.message
          : typeof exception === 'string'
            ? exception
            : '服务器内部错误';
      const errorStack = exception instanceof Error ? exception.stack : undefined;
      const errorCode =
        typeof exception === 'object' && exception !== null
          ? (exception as { code?: string }).code
          : undefined;

      errorResponse = {
        error: {
          code: ResponseCode.INTERNAL_ERROR,
          message: errorMessage,
          details: errorCode ? `error_code: ${errorCode}` : undefined,
          timestamp: Date.now(),
        },
      };

      this.logger.error(
        `[${method}] ${url} -> 500 ${errorMessage}`,
        errorStack || JSON.stringify(exception),
      );
    }

    response.status(httpStatus).json(errorResponse);
  }
}
