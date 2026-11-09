import { Injectable } from '@nestjs/common';
import { TicketPriority, TicketStatus } from '@prisma/client';
import { DashboardRepository } from './dashboard.repository';

const DAY_MS = 24 * 60 * 60 * 1000;
const CHART_DAYS = 14;

const startOfUtcDay = (date: Date): Date =>
  new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
const dayKey = (date: Date): string => date.toISOString().slice(0, 10);

@Injectable()
export class DashboardService {
  constructor(private readonly dashboard: DashboardRepository) {}

  async getSummary(now = new Date()) {
    const today = startOfUtcDay(now);
    const since = new Date(today.getTime() - (CHART_DAYS - 1) * DAY_MS);
    const [
      all,
      open,
      overdue,
      createdToday,
      statuses,
      sla,
      agents,
      openBy,
      overdueBy,
      resolvedBy,
      days,
    ] = await Promise.all([
      this.dashboard.countAll(),
      this.dashboard.countOpen(),
      this.dashboard.countOverdue(now),
      this.dashboard.countCreatedSince(today),
      this.dashboard.countByStatus(),
      this.dashboard.slaByPriority(),
      this.dashboard.findAgents(),
      this.dashboard.countByAssignee({ open: true }),
      this.dashboard.countByAssignee({ overdueAt: now }),
      this.dashboard.countByAssignee({ resolved: true }),
      this.dashboard.createdByDay(since),
    ]);

    const statusCounts = new Map(statuses.map((row) => [row.status, row.count]));
    const slaCounts = new Map(sla.map((row) => [row.priority, row]));
    const totalTracked = sla.reduce((sum, row) => sum + row.total, 0);
    const totalBreached = sla.reduce((sum, row) => sum + row.breached, 0);
    const dayCounts = new Map(days.map((row) => [dayKey(row.date), Number(row.count)]));

    return {
      totals: { all, open, overdue, createdToday },
      byStatus: Object.values(TicketStatus).map((status) => ({
        status,
        count: statusCounts.get(status) ?? 0,
      })),
      sla: {
        compliancePercent:
          totalTracked === 0
            ? 100
            : Math.round(((totalTracked - totalBreached) / totalTracked) * 1000) / 10,
        byPriority: Object.values(TicketPriority).map((priority) => {
          const row = slaCounts.get(priority);
          const breached = row?.breached ?? 0;
          return { priority, breached, onTime: (row?.total ?? 0) - breached };
        }),
      },
      agentLoad: agents.map((agent) => ({
        agent,
        open: openBy.get(agent.id) ?? 0,
        overdue: overdueBy.get(agent.id) ?? 0,
        resolved: resolvedBy.get(agent.id) ?? 0,
      })),
      createdByDay: Array.from({ length: CHART_DAYS }, (_unused, index) => {
        const date = dayKey(new Date(since.getTime() + index * DAY_MS));
        return { date, count: dayCounts.get(date) ?? 0 };
      }),
    };
  }
}
