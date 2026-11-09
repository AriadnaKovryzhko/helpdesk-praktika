import { HttpStatus, ValidationError, ValidationPipe } from '@nestjs/common';
import { AppException } from '../errors/app.exception';

export interface FieldError {
  field: string;
  messages: string[];
}

export function flattenValidationErrors(errors: ValidationError[], parent = ''): FieldError[] {
  return errors.flatMap((error) => {
    const field = parent ? `${parent}.${error.property}` : error.property;
    const own = error.constraints
      ? [
          {
            field,
            messages: Object.entries(error.constraints).map(([rule, message]) =>
              rule === 'whitelistValidation' ? 'Это поле не поддерживается' : message,
            ),
          },
        ]
      : [];
    return [...own, ...flattenValidationErrors(error.children ?? [], field)];
  });
}

export function createValidationPipe(): ValidationPipe {
  return new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    exceptionFactory: (errors) =>
      new AppException(
        HttpStatus.BAD_REQUEST,
        'VALIDATION_ERROR',
        'Проверьте правильность заполнения полей',
        flattenValidationErrors(errors),
      ),
  });
}
