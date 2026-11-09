import { RoleCode, TicketPriority, TicketStatus } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { CategoriesRepository } from '../categories/categories.repository';
import { AuthUser } from '../common/auth/auth-user';
import { AppException } from '../common/errors/app.exception';
import { NotificationsService } from '../notifications/notifications.service';
import { UsersRepository, UserWithRoles } from '../users/users.repository';
import { SlaService } from './sla.service';
import { TicketPolicyService } from './ticket-policy.service';
import { TicketsRepository, TicketWithRelations } from './tickets.repository';
import { TicketsService } from './tickets.service';

const user = (id: string, ...roles: RoleCode[]): AuthUser => ({
  id,
  email: `${id}@t.ru`,
  fullName: id,
  roles,
});
const author = user('author', RoleCode.USER);
const agent = user('agent', RoleCode.AGENT);
const manager = user('manager', RoleCode.MANAGER);
const brief = (id: string) => ({ id, fullName: id, email: `${id}@t.ru` });

function ticketRow(overrides: Partial<TicketWithRelations> = {}): TicketWithRelations {
  const now = new Date();
  return {
    id: 't1',
    number: 7,
    title: 'Заявка',
    description: 'Описание заявки',
    status: TicketStatus.NEW,
    priority: TicketPriority.MEDIUM,
    categoryId: 1,
    authorId: 'author',
    assigneeId: null,
    reactionDueAt: new Date(now.getTime() + 60_000),
    resolutionDueAt: new Date(now.getTime() + 120_000),
    reactedAt: null,
    resolvedAt: null,
    closedAt: null,
    reactionBreachedAt: null,
    resolutionBreachedAt: null,
    createdAt: now,
    updatedAt: now,
    category: { id: 1, name: 'Категория' },
    author: brief('author'),
    assignee: null,
    ...overrides,
  };
}

const agentRow = (overrides: Partial<UserWithRoles> = {}): UserWithRoles => ({
  id: 'agent',
  email: 'agent@t.ru',
  passwordHash: 'x',
  fullName: 'agent',
  phone: null,
  isBlocked: false,
  createdAt: new Date(),
  updatedAt: new Date(),
  roles: [{ userId: 'agent', roleId: 2, role: { id: 2, code: RoleCode.AGENT, name: 'x' } }],
  ...overrides,
});

describe('TicketsService', () => {
  let repo: jest.Mocked<TicketsRepository>;
  let sla: jest.Mocked<Pick<SlaService, 'calculateDeadlines'>>;
  let categories: jest.Mocked<Pick<CategoriesRepository, 'findById'>>;
  let users: jest.Mocked<Pick<UsersRepository, 'findById'>>;
  let notifications: jest.Mocked<Pick<NotificationsService, 'notify' | 'usersWithRoles'>>;
  let audit: jest.Mocked<Pick<AuditService, 'record'>>;
  let service: TicketsService;

  const failure = async (promise: Promise<unknown>) => {
    const error = await promise.catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(AppException);
    return error as AppException;
  };

  beforeEach(() => {
    repo = {
      findById: jest.fn(),
      findPage: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      applyStatusChange: jest.fn(),
      applyAssignment: jest.fn(),
      findHistory: jest.fn(),
    } as unknown as jest.Mocked<TicketsRepository>;
    sla = { calculateDeadlines: jest.fn() };
    categories = { findById: jest.fn().mockResolvedValue({ id: 1, isActive: true }) };
    users = { findById: jest.fn().mockResolvedValue(agentRow()) };
    notifications = {
      notify: jest.fn(),
      usersWithRoles: jest.fn().mockResolvedValue(['agent', 'manager']),
    };
    audit = { record: jest.fn() };
    service = new TicketsService(
      repo,
      new TicketPolicyService(),
      sla as unknown as SlaService,
      categories as unknown as CategoriesRepository,
      users as unknown as UsersRepository,
      notifications as unknown as NotificationsService,
      audit as unknown as AuditService,
    );
  });

  describe('создание', () => {
    const dto = {
      title: 'Заявка',
      description: 'Описание заявки',
      categoryId: 1,
      priority: TicketPriority.HIGH,
    };

    it('рассчитывает сроки и уведомляет исполнителей', async () => {
      const deadlines = { reactionDueAt: new Date(), resolutionDueAt: new Date() };
      sla.calculateDeadlines.mockResolvedValue(deadlines);
      repo.create.mockResolvedValue(ticketRow());
      await service.create(dto, author);
      expect(repo.create).toHaveBeenCalledWith({ ...dto, ...deadlines, authorId: 'author' });
      expect(notifications.notify).toHaveBeenCalledWith(
        expect.objectContaining({ userIds: ['agent', 'manager'], excludeUserId: 'author' }),
      );
      expect(audit.record).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'TICKET_CREATED' }),
      );
    });

    it('отклоняет отключённую категорию', async () => {
      categories.findById.mockResolvedValue({ isActive: false } as never);
      expect((await failure(service.create(dto, author))).code).toBe('INVALID_CATEGORY');
      expect(repo.create).not.toHaveBeenCalled();
    });
  });

  describe('доступ', () => {
    it('скрывает чужую заявку ошибкой 404', async () => {
      repo.findById.mockResolvedValue(ticketRow());
      const error = await failure(service.getDetails('t1', user('stranger', RoleCode.USER)));
      expect(error.getStatus()).toBe(404);
    });

    it('возвращает разрешённые действия', async () => {
      repo.findById.mockResolvedValue(ticketRow());
      const details = await service.getDetails('t1', agent);
      expect(details.canTake).toBe(true);
      expect(details.canAssign).toBe(false);
    });
  });

  describe('смена статуса', () => {
    it('выполняет разрешённый переход и пишет историю', async () => {
      const current = ticketRow({ status: TicketStatus.IN_PROGRESS, assigneeId: 'agent' });
      repo.findById.mockResolvedValue(current);
      repo.applyStatusChange.mockResolvedValue({ ...current, status: TicketStatus.RESOLVED });
      const result = await service.changeStatus('t1', { status: TicketStatus.RESOLVED }, agent);
      expect(result.status).toBe(TicketStatus.RESOLVED);
      expect(repo.applyStatusChange).toHaveBeenCalledWith(
        expect.objectContaining({
          fromStatus: TicketStatus.IN_PROGRESS,
          toStatus: TicketStatus.RESOLVED,
          changedById: 'agent',
          data: { resolvedAt: expect.any(Date) },
        }),
      );
      expect(notifications.notify).toHaveBeenCalled();
    });

    it('запрещает переход, которого нет в схеме', async () => {
      repo.findById.mockResolvedValue(ticketRow({ assigneeId: 'agent' }));
      const error = await failure(
        service.changeStatus('t1', { status: TicketStatus.CLOSED }, agent),
      );
      expect(error.code).toBe('INVALID_STATUS_TRANSITION');
      expect(error.getStatus()).toBe(409);
    });

    it('запрещает автору решить заявку', async () => {
      repo.findById.mockResolvedValue(
        ticketRow({ status: TicketStatus.IN_PROGRESS, assigneeId: 'agent' }),
      );
      const error = await failure(
        service.changeStatus('t1', { status: TicketStatus.RESOLVED }, author),
      );
      expect(error.getStatus()).toBe(403);
    });

    it('требует назначение через отдельное действие', async () => {
      repo.findById.mockResolvedValue(ticketRow());
      const error = await failure(
        service.changeStatus('t1', { status: TicketStatus.ASSIGNED }, manager),
      );
      expect(error.code).toBe('ASSIGNEE_REQUIRED');
    });

    it('очищает дату решения при переоткрытии', async () => {
      const current = ticketRow({ status: TicketStatus.RESOLVED, assigneeId: 'agent' });
      repo.findById.mockResolvedValue(current);
      repo.applyStatusChange.mockResolvedValue(current);
      await service.changeStatus('t1', { status: TicketStatus.IN_PROGRESS }, author);
      expect(repo.applyStatusChange.mock.calls[0][0].data).toEqual({ resolvedAt: null });
    });

    it('сообщает о конфликте при одновременном изменении', async () => {
      repo.findById.mockResolvedValue(
        ticketRow({ status: TicketStatus.ASSIGNED, assigneeId: 'agent' }),
      );
      repo.applyStatusChange.mockResolvedValue(null);
      const error = await failure(
        service.changeStatus('t1', { status: TicketStatus.IN_PROGRESS }, agent),
      );
      expect(error.code).toBe('TICKET_CHANGED');
    });
  });

  describe('назначение', () => {
    it('назначает заявку на взявшего её исполнителя', async () => {
      const current = ticketRow();
      repo.findById.mockResolvedValue(current);
      repo.applyAssignment.mockResolvedValue({
        ...current,
        status: TicketStatus.ASSIGNED,
        assigneeId: 'agent',
        assignee: brief('agent'),
      });
      const result = await service.assign('t1', {}, agent);
      expect(result.status).toBe(TicketStatus.ASSIGNED);
      expect(repo.applyAssignment).toHaveBeenCalledWith(
        expect.objectContaining({ assigneeId: 'agent', currentAssigneeId: null }),
      );
    });

    it('не даёт исполнителю назначить коллегу', async () => {
      repo.findById.mockResolvedValue(ticketRow());
      const error = await failure(service.assign('t1', { assigneeId: 'other' }, agent));
      expect(error.getStatus()).toBe(403);
    });

    it('не даёт взять уже назначенную заявку', async () => {
      repo.findById.mockResolvedValue(
        ticketRow({ status: TicketStatus.ASSIGNED, assigneeId: 'agent' }),
      );
      expect((await failure(service.assign('t1', {}, agent))).code).toBe('ALREADY_ASSIGNED');
    });

    it('требует руководителя указать исполнителя', async () => {
      repo.findById.mockResolvedValue(ticketRow());
      expect((await failure(service.assign('t1', {}, manager))).code).toBe('ASSIGNEE_REQUIRED');
    });

    it('не назначает заблокированного сотрудника', async () => {
      repo.findById.mockResolvedValue(ticketRow());
      users.findById.mockResolvedValue(agentRow({ isBlocked: true }));
      expect((await failure(service.assign('t1', { assigneeId: 'agent' }, manager))).code).toBe(
        'INVALID_ASSIGNEE',
      );
    });

    it('сообщает о гонке, если заявку взяли раньше', async () => {
      repo.findById.mockResolvedValue(ticketRow());
      repo.applyAssignment.mockResolvedValue(null);
      expect((await failure(service.assign('t1', {}, agent))).code).toBe('TICKET_CHANGED');
    });
  });

  describe('изменение и удаление', () => {
    it('пересчитывает сроки при смене приоритета', async () => {
      const current = ticketRow({ assigneeId: 'agent', status: TicketStatus.IN_PROGRESS });
      repo.findById.mockResolvedValue(current);
      repo.update.mockResolvedValue(current);
      sla.calculateDeadlines.mockResolvedValue({
        reactionDueAt: new Date(Date.now() + 1000),
        resolutionDueAt: new Date(Date.now() + 2000),
      });
      await service.update('t1', { priority: TicketPriority.LOW }, agent);
      expect(sla.calculateDeadlines).toHaveBeenCalledWith(TicketPriority.LOW, current.createdAt);
      expect(repo.update.mock.calls[0][1]).toEqual(
        expect.objectContaining({ reactionBreachedAt: null, resolutionBreachedAt: null }),
      );
    });

    it('не даёт автору менять взятую заявку', async () => {
      repo.findById.mockResolvedValue(
        ticketRow({ status: TicketStatus.IN_PROGRESS, assigneeId: 'agent' }),
      );
      expect((await failure(service.update('t1', { title: 'Новая' }, author))).getStatus()).toBe(
        403,
      );
    });

    it('удаляет новую заявку автора', async () => {
      repo.findById.mockResolvedValue(ticketRow());
      await service.remove('t1', author);
      expect(repo.delete).toHaveBeenCalledWith('t1');
    });

    it('запрещает удаление заявки в работе автором', async () => {
      repo.findById.mockResolvedValue(
        ticketRow({ status: TicketStatus.IN_PROGRESS, assigneeId: 'agent' }),
      );
      await failure(service.remove('t1', author));
      expect(repo.delete).not.toHaveBeenCalled();
    });
  });

  describe('список', () => {
    const query = { page: 2, pageSize: 10, sortBy: 'createdAt', sortOrder: 'desc' } as never;

    it('применяет пагинацию и ограничение видимости', async () => {
      repo.findPage.mockResolvedValue([[ticketRow()], 11]);
      const result = await service.list(query, author);
      expect(result.meta).toEqual({ page: 2, pageSize: 10, total: 11, totalPages: 2 });
      const [where, orderBy, skip, take] = repo.findPage.mock.calls[0];
      expect(where).toEqual({ AND: [{ authorId: 'author' }] });
      expect(orderBy).toEqual({ createdAt: 'desc' });
      expect([skip, take]).toEqual([10, 10]);
    });

    it('ищет по номеру, если запрос состоит из цифр', async () => {
      repo.findPage.mockResolvedValue([[], 0]);
      await service.list({ ...(query as object), search: '42' } as never, manager);
      expect(JSON.stringify(repo.findPage.mock.calls[0][0])).toContain('"number":42');
    });

    it('добавляет фильтры', async () => {
      repo.findPage.mockResolvedValue([[], 0]);
      await service.list(
        {
          ...(query as object),
          status: TicketStatus.NEW,
          priority: TicketPriority.LOW,
          categoryId: 3,
          assignedToMe: true,
          createdByMe: true,
          overdue: false,
        } as never,
        agent,
      );
      const where = JSON.stringify(repo.findPage.mock.calls[0][0]);
      expect(where).toContain('"status":"NEW"');
      expect(where).toContain('"categoryId":3');
      expect(where).toContain('"NOT"');
    });
  });
});
