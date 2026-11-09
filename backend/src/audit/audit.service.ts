import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PageResult } from '../common/dto/page-result';
import { currentRequestIp } from '../common/context/request-context';
import { AuditActionCode } from './audit.actions';
import { AuditLogWithActor, AuditRepository } from './audit.repository';
import { AuditQueryDto } from './dto/audit.dto';

export interface AuditEntry {
  actorId: string | null;
  action: AuditActionCode;
  entityType: string;
  entityId?: string | number | null;
  details?: Prisma.InputJsonValue;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly audit: AuditRepository) {}

  // Сбой записи журнала не должен отменять уже выполненное действие пользователя.
  async record(entry: AuditEntry): Promise<void> {
    try {
      await this.audit.create({
        actorId: entry.actorId,
        action: entry.action,
        entityType: entry.entityType,
        entityId:
          entry.entityId === undefined || entry.entityId === null ? null : String(entry.entityId),
        details: entry.details,
        ip: currentRequestIp(),
      });
    } catch (error) {
      this.logger.error(`Не удалось записать действие ${entry.action}`, error);
    }
  }

  async list(query: AuditQueryDto): Promise<PageResult<AuditLogWithActor>> {
    const [rows, total] = await this.audit.findPage(
      this.buildWhere(query),
      query.sortOrder,
      (query.page - 1) * query.pageSize,
      query.pageSize,
    );
    return PageResult.of(rows, total, query.page, query.pageSize);
  }

  private buildWhere(query: AuditQueryDto): Prisma.AuditLogWhereInput {
    const search = query.search?.trim();
    return {
      ...(query.action ? { action: query.action } : {}),
      ...(query.entityType ? { entityType: query.entityType } : {}),
      ...(query.actorId ? { actorId: query.actorId } : {}),
      ...(query.dateFrom || query.dateTo
        ? {
            createdAt: {
              ...(query.dateFrom ? { gte: new Date(query.dateFrom) } : {}),
              ...(query.dateTo ? { lte: new Date(query.dateTo) } : {}),
            },
          }
        : {}),
      ...(search
        ? {
            OR: [
              { action: { contains: search, mode: 'insensitive' as const } },
              { entityId: { contains: search, mode: 'insensitive' as const } },
              { actor: { fullName: { contains: search, mode: 'insensitive' as const } } },
              { actor: { email: { contains: search, mode: 'insensitive' as const } } },
            ],
          }
        : {}),
    };
  }
}
