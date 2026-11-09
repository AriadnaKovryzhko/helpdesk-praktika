import { Prisma } from '@prisma/client';

export interface MappedPrismaError {
  status: number;
  code: string;
  message: string;
}

const PRISMA_ERRORS: Record<string, MappedPrismaError> = {
  P2002: { status: 409, code: 'CONFLICT', message: 'Запись с такими данными уже существует' },
  P2003: { status: 409, code: 'CONFLICT', message: 'Запись связана с другими данными' },
  P2025: { status: 404, code: 'NOT_FOUND', message: 'Запись не найдена' },
};

export function mapPrismaError(exception: unknown): MappedPrismaError | null {
  if (exception instanceof Prisma.PrismaClientKnownRequestError) {
    return PRISMA_ERRORS[exception.code] ?? null;
  }
  return null;
}
