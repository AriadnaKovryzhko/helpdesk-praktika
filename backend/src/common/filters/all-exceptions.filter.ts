import { ArgumentsHost, Catch, ExceptionFilter, HttpException, Logger } from '@nestjs/common';
import { Response } from 'express';
import { AppException } from '../errors/app.exception';
import { mapPrismaError } from './prisma-errors';

export interface ApiError {
  status: number;
  code: string;
  message: string;
  details: unknown;
}

const DEFAULT_ERRORS: Record<number, { code: string; message: string }> = {
  400: { code: 'BAD_REQUEST', message: 'Некорректный запрос' },
  401: { code: 'UNAUTHORIZED', message: 'Требуется вход в систему' },
  403: { code: 'FORBIDDEN', message: 'Недостаточно прав' },
  404: { code: 'NOT_FOUND', message: 'Ресурс не найден' },
  405: { code: 'METHOD_NOT_ALLOWED', message: 'Метод не поддерживается' },
  409: { code: 'CONFLICT', message: 'Конфликт данных' },
  413: { code: 'PAYLOAD_TOO_LARGE', message: 'Размер файла превышает допустимые 5 МБ' },
  415: { code: 'UNSUPPORTED_MEDIA_TYPE', message: 'Неподдерживаемый формат данных' },
  429: { code: 'TOO_MANY_REQUESTS', message: 'Слишком много запросов, повторите позже' },
};

const INTERNAL_ERROR: ApiError = {
  status: 500,
  code: 'INTERNAL_ERROR',
  message: 'Внутренняя ошибка сервера',
  details: null,
};

export function toApiError(exception: unknown): ApiError {
  if (exception instanceof AppException) {
    return {
      status: exception.getStatus(),
      code: exception.code,
      message: exception.message,
      details: exception.details ?? null,
    };
  }
  if (exception instanceof HttpException) {
    const status = exception.getStatus();
    const known = DEFAULT_ERRORS[status];
    return known
      ? { status, ...known, details: null }
      : { status, code: 'HTTP_ERROR', message: exception.message, details: null };
  }
  const prismaError = mapPrismaError(exception);
  return prismaError ? { ...prismaError, details: null } : INTERNAL_ERROR;
}

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    const { status, code, message, details } = toApiError(exception);
    if (status >= 500) {
      this.logger.error(exception instanceof Error ? exception.stack : String(exception));
    }
    if (!response.headersSent) {
      response.status(status).json({ error: { code, message, details } });
    }
  }
}
