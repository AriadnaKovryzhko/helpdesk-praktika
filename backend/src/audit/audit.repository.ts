import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

const AUDIT_INCLUDE = {
  actor: { select: { id: true, fullName: true, email: true } },
} satisfies Prisma.AuditLogInclude;

export type AuditLogWithActor = Prisma.AuditLogGetPayload<{ include: typeof AUDIT_INCLUDE }>;

@Injectable()
export class AuditRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: Prisma.AuditLogUncheckedCreateInput): Promise<void> {
    await this.prisma.auditLog.create({ data });
  }

  async findPage(
    where: Prisma.AuditLogWhereInput,
    sortOrder: Prisma.SortOrder,
    skip: number,
    take: number,
  ): Promise<[AuditLogWithActor[], number]> {
    return this.prisma.$transaction([
      this.prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: sortOrder },
        skip,
        take,
        include: AUDIT_INCLUDE,
      }),
      this.prisma.auditLog.count({ where }),
    ]);
  }
}
