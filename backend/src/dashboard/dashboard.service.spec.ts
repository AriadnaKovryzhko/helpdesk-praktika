import { TicketPriority, TicketStatus } from '@prisma/client';
import { DashboardRepository } from './dashboard.repository';
import { DashboardService } from './dashboard.service';

describe('DashboardService', () => {
  it('собирает показатели и заполняет пустые значения нулями', async () => {
    const now = new Date('2026-03-15T12:00:00.000Z');
    const agent = { id: 'a', fullName: 'Исполнитель', email: 'a@t.ru' };
    const repo = {
      countAll: jest.fn().mockResolvedValue(10),
      countOpen: jest.fn().mockResolvedValue(6),
      countOverdue: jest.fn().mockResolvedValue(2),
      countCreatedSince: jest.fn().mockResolvedValue(1),
      countByStatus: jest.fn().mockResolvedValue([{ status: TicketStatus.NEW, count: 3 }]),
      slaByPriority: jest
        .fn()
        .mockResolvedValue([{ priority: TicketPriority.HIGH, breached: 1, total: 4 }]),
      findAgents: jest.fn().mockResolvedValue([agent]),
      countByAssignee: jest
        .fn()
        .mockResolvedValueOnce(new Map([['a', 5]]))
        .mockResolvedValueOnce(new Map())
        .mockResolvedValueOnce(new Map([['a', 9]])),
      createdByDay: jest
        .fn()
        .mockResolvedValue([{ date: new Date('2026-03-15T00:00:00.000Z'), count: 7n }]),
    };
    const summary = await new DashboardService(repo as unknown as DashboardRepository).getSummary(
      now,
    );

    expect(summary.totals).toEqual({ all: 10, open: 6, overdue: 2, createdToday: 1 });
    expect(summary.byStatus).toHaveLength(6);
    expect(summary.byStatus[0]).toEqual({ status: TicketStatus.NEW, count: 3 });
    expect(summary.sla.compliancePercent).toBe(75);
    expect(summary.sla.byPriority.find((row) => row.priority === TicketPriority.HIGH)).toEqual({
      priority: TicketPriority.HIGH,
      breached: 1,
      onTime: 3,
    });
    expect(summary.agentLoad).toEqual([{ agent, open: 5, overdue: 0, resolved: 9 }]);
    expect(summary.createdByDay).toHaveLength(14);
    expect(summary.createdByDay[13]).toEqual({ date: '2026-03-15', count: 7 });
    expect(summary.createdByDay[0].count).toBe(0);
  });
});
