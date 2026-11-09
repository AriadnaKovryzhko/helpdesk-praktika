import { TicketPriority } from '@prisma/client';
import { AppException } from '../common/errors/app.exception';
import { NotificationsService } from '../notifications/notifications.service';
import { SlaPoliciesRepository } from '../sla-policies/sla-policies.repository';
import { SlaService } from './sla.service';
import { TicketsRepository, TicketWithRelations } from './tickets.repository';

const ticket = (id: string, assigneeId: string | null) =>
  ({ id, number: 1, title: 'Заявка', assigneeId }) as TicketWithRelations;

describe('SlaService', () => {
  let policies: jest.Mocked<Pick<SlaPoliciesRepository, 'findByPriority'>>;
  let tickets: jest.Mocked<
    Pick<
      TicketsRepository,
      | 'findReactionBreaches'
      | 'findResolutionBreaches'
      | 'markReactionBreached'
      | 'markResolutionBreached'
    >
  >;
  let notifications: jest.Mocked<Pick<NotificationsService, 'notify' | 'usersWithRoles'>>;
  let service: SlaService;

  beforeEach(() => {
    policies = { findByPriority: jest.fn() };
    tickets = {
      findReactionBreaches: jest.fn().mockResolvedValue([]),
      findResolutionBreaches: jest.fn().mockResolvedValue([]),
      markReactionBreached: jest.fn().mockResolvedValue(true),
      markResolutionBreached: jest.fn().mockResolvedValue(true),
    };
    notifications = {
      notify: jest.fn(),
      usersWithRoles: jest.fn().mockResolvedValue(['manager']),
    };
    service = new SlaService(
      policies as unknown as SlaPoliciesRepository,
      tickets as unknown as TicketsRepository,
      notifications as unknown as NotificationsService,
    );
  });

  it('считает сроки от заданного момента по политике', async () => {
    policies.findByPriority.mockResolvedValue({
      id: 1,
      priority: TicketPriority.HIGH,
      reactionMinutes: 60,
      resolutionMinutes: 480,
    });
    const from = new Date('2026-01-01T10:00:00.000Z');
    const result = await service.calculateDeadlines(TicketPriority.HIGH, from);
    expect(result.reactionDueAt.toISOString()).toBe('2026-01-01T11:00:00.000Z');
    expect(result.resolutionDueAt.toISOString()).toBe('2026-01-01T18:00:00.000Z');
  });

  it('сообщает об отсутствии политики', async () => {
    policies.findByPriority.mockResolvedValue(null);
    await expect(service.calculateDeadlines(TicketPriority.LOW, new Date())).rejects.toBeInstanceOf(
      AppException,
    );
  });

  it('отмечает просрочку и уведомляет исполнителя и руководителя', async () => {
    tickets.findResolutionBreaches.mockResolvedValue([ticket('t1', 'agent')]);
    expect(await service.markBreaches(new Date())).toBe(1);
    expect(notifications.notify).toHaveBeenCalledWith(
      expect.objectContaining({ userIds: ['manager', 'agent'], ticketId: 't1' }),
    );
  });

  it('не отправляет повторное уведомление, если просрочка уже отмечена', async () => {
    tickets.findReactionBreaches.mockResolvedValue([ticket('t1', null)]);
    tickets.markReactionBreached.mockResolvedValue(false);
    expect(await service.markBreaches(new Date())).toBe(0);
    expect(notifications.notify).not.toHaveBeenCalled();
  });
});
