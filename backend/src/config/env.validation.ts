import { Logger } from '@nestjs/common';

const REQUIRED = ['DATABASE_URL', 'JWT_ACCESS_SECRET', 'CORS_ORIGIN', 'APP_URL'] as const;
const MIN_SECRET_LENGTH = 32;
const LOCAL_SECRET_PREFIX = 'local-dev-only';

export function validateEnv(config: Record<string, unknown>): Record<string, unknown> {
  for (const key of REQUIRED) {
    if (!config[key]) throw new Error(`Не задана переменная окружения ${key}`);
  }
  const secret = String(config.JWT_ACCESS_SECRET);
  if (secret.length < MIN_SECRET_LENGTH) {
    throw new Error(`JWT_ACCESS_SECRET должен быть не короче ${MIN_SECRET_LENGTH} символов`);
  }
  if (config.COOKIE_SECURE === 'true' && secret.startsWith(LOCAL_SECRET_PREFIX)) {
    throw new Error('Для публичного запуска задайте собственный JWT_ACCESS_SECRET');
  }
  if (secret.startsWith(LOCAL_SECRET_PREFIX)) {
    new Logger('Config').warn('Используется локальный JWT_ACCESS_SECRET');
  }
  return config;
}
