import { Injectable } from '@nestjs/common';
import { RoleCode, TicketPriority, TicketStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { OPEN_STATUSES } from '../tickets/ticket-status';

export interface DayCount {
  date: Date;
  count: bigint;
}

@Injectable()
export class DashboardRepository {
  constructor(private readonly prisma: PrismaService) {}

  countAll(): Promise<number> {
    return this.prisma.ticket.count();
  }

  countOpen(): Promise<number> {
    return this.prisma.ticket.count({ where: { status: { in: OPEN_STATUSES } } });
  }

  countCreatedSince(since: Date): Promise<number> {
    return this.prisma.ticket.count({ where: { createdAt: { gte: since } } });
  }

  countOverdue(now: Date): Promise<number> {
    return this.prisma.ticket.count({ where: this.overdueWhere(now) });
  }

  async countByStatus(): Promise<{ status: TicketStatus; count: number }[]> {
    const rows = await this.prisma.ticket.groupBy({ by: ['status'], _count: { _all: true } });
    return rows.map((row) => ({ status: row.status, count: row._count._all }));
  }

  async slaByPriority(): Promise<{ priority: TicketPriority; breached: number; total: number }[]> {
    const [totals, breached] = await Promise.all([
      this.prisma.ticket.groupBy({ by: ['priority'], _count: { _all: true } }),
      this.prisma.ticket.groupBy({
        by: ['priority'],
        where: {
          OR: [{ resolutionBreachedAt: { not: null } }, { reactionBreachedAt: { not: null } }],
        },
        _count: { _all: true },
      }),
    ]);
    const breachedByPriority = new Map(breached.map((row) => [row.priority, row._count._all]));
    return totals.map((row) => ({
      priority: row.priority,
      total: row._count._all,
      breached: breachedByPriority.get(row.priority) ?? 0,
    }));
  }

  findAgents() {
    return this.prisma.user.findMany({
      where: { isBlocked: false, roles: { some: { role: { code: RoleCode.AGENT } } } },
      orderBy: { fullName: 'asc' },
      select: { id: true, fullName: true, email: true },
    });
  }

  async countByAssignee(where: {
    open?: boolean;
    resolved?: boolean;
    overdueAt?: Date;
  }): Promise<Map<string, number>> {
    const rows = await this.prisma.ticket.groupBy({
      by: ['assigneeId'],
      where: {
        assigneeId: { not: null },
        ...(where.open ? { status: { in: OPEN_STATUSES } } : {}),
        ...(where.resolved ? { status: { in: [TicketStatus.RESOLVED, TicketStatus.CLOSED] } } : {}),
        ...(where.overdueAt ? this.overdueWhere(where.overdueAt) : {}),
      },
      _count: { _all: true },
    });
    return new Map(rows.map((row) => [row.assigneeId as string, row._count._all]));
  }

  createdByDay(since: Date): Promise<DayCount[]> {
    return this.prisma.$queryRaw<DayCount[]>`
      SELECT date_trunc('day', created_at) AS date, COUNT(*) AS count
      FROM tickets
      WHERE created_at >= ${since}
      GROUP BY 1
      ORDER BY 1`;
  }

  private overdueWhere(now: Date) {
    return {
      status: { in: OPEN_STATUSES },
      OR: [
        { resolutionDueAt: { lt: now } },
        { status: TicketStatus.NEW, reactionDueAt: { lt: now } },
      ],
    };
  }
}
