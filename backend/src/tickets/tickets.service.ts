import { HttpStatus, Injectable } from '@nestjs/common';
import { NotificationType, Prisma, RoleCode, TicketStatus } from '@prisma/client';
import { AuditAction, AuditActionCode } from '../audit/audit.actions';
import { AuditService } from '../audit/audit.service';
import { AuthUser, hasRole } from '../common/auth/auth-user';
import { PageResult } from '../common/dto/page-result';
import { AppException } from '../common/errors/app.exception';
import { CategoriesRepository } from '../categories/categories.repository';
import { NotificationsService } from '../notifications/notifications.service';
import { UsersRepository } from '../users/users.repository';
import { roleCodes } from '../users/user.presenter';
import {
  AssignTicketDto,
  ChangeStatusDto,
  CreateTicketDto,
  TicketsQueryDto,
  UpdateTicketDto,
} from './dto/ticket.dto';
import { SlaService } from './sla.service';
import { TicketPolicyService } from './ticket-policy.service';
import { OPEN_STATUSES, STATUS_LABELS, TRANSITIONS } from './ticket-status';
import { TicketDto, toTicketDto } from './ticket.presenter';
import { TicketsRepository, TicketWithRelations } from './tickets.repository';

const notFound = () =>
  new AppException(HttpStatus.NOT_FOUND, 'TICKET_NOT_FOUND', 'Заявка не найдена');
const forbidden = (message: string) => new AppException(HttpStatus.FORBIDDEN, 'FORBIDDEN', message);
const staleTicket = () =>
  new AppException(
    HttpStatus.CONFLICT,
    'TICKET_CHANGED',
    'Заявка уже изменена другим участником, обновите страницу',
  );

@Injectable()
export class TicketsService {
  constructor(
    private readonly tickets: TicketsRepository,
    private readonly policy: TicketPolicyService,
    private readonly sla: SlaService,
    private readonly categories: CategoriesRepository,
    private readonly users: UsersRepository,
    private readonly notifications: NotificationsService,
    private readonly audit: AuditService,
  ) {}

  async list(query: TicketsQueryDto, user: AuthUser): Promise<PageResult<TicketDto>> {
    const skip = (query.page - 1) * query.pageSize;
    const [rows, total] = await this.tickets.findPage(
      this.buildWhere(query, user),
      { [query.sortBy]: query.sortOrder },
      skip,
      query.pageSize,
    );
    const now = new Date();
    return PageResult.of(
      rows.map((row) => toTicketDto(row, now)),
      total,
      query.page,
      query.pageSize,
    );
  }

  async create(dto: CreateTicketDto, user: AuthUser): Promise<TicketDto> {
    await this.assertActiveCategory(dto.categoryId);
    const deadlines = await this.sla.calculateDeadlines(dto.priority, new Date());
    const ticket = await this.tickets.create({ ...dto, ...deadlines, authorId: user.id });
    await this.recordTicket(user, AuditAction.TICKET_CREATED, ticket, {
      priority: ticket.priority,
    });
    await this.notifications.notify({
      userIds: await this.notifications.usersWithRoles(RoleCode.AGENT, RoleCode.MANAGER),
      ticketId: ticket.id,
      type: NotificationType.TICKET_CREATED,
      title: `Новая заявка №${ticket.number}`,
      body: ticket.title,
      excludeUserId: user.id,
    });
    return toTicketDto(ticket);
  }

  async getDetails(id: string, user: AuthUser) {
    return this.present(await this.getAccessible(id, user), user);
  }

  async getAccessible(id: string, user: AuthUser): Promise<TicketWithRelations> {
    const ticket = await this.tickets.findById(id);
    if (!ticket || !this.policy.canView(ticket, user)) throw notFound();
    return ticket;
  }

  async update(id: string, dto: UpdateTicketDto, user: AuthUser) {
    const ticket = await this.getAccessible(id, user);
    if (!this.policy.canEdit(ticket, user)) throw forbidden('Эту заявку нельзя изменить');
    if (dto.categoryId !== undefined && dto.categoryId !== ticket.categoryId) {
      await this.assertActiveCategory(dto.categoryId);
    }
    const deadlines =
      dto.priority && dto.priority !== ticket.priority
        ? await this.recalculateDeadlines(ticket, dto.priority)
        : {};
    const updated = await this.tickets.update(id, { ...dto, ...deadlines });
    await this.recordTicket(user, AuditAction.TICKET_UPDATED, updated, {
      fields: Object.keys(dto),
    });
    return this.present(updated, user);
  }

  async remove(id: string, user: AuthUser): Promise<void> {
    const ticket = await this.getAccessible(id, user);
    if (!this.policy.canDelete(ticket, user)) throw forbidden('Эту заявку нельзя удалить');
    await this.tickets.delete(id);
    await this.recordTicket(user, AuditAction.TICKET_DELETED, ticket, { title: ticket.title });
  }

  async changeStatus(id: string, dto: ChangeStatusDto, user: AuthUser) {
    const ticket = await this.getAccessible(id, user);
    if (dto.status === TicketStatus.ASSIGNED) {
      throw new AppException(
        HttpStatus.CONFLICT,
        'ASSIGNEE_REQUIRED',
        'Чтобы назначить заявку, выберите исполнителя',
      );
    }
    if (!TRANSITIONS[ticket.status].includes(dto.status)) {
      throw new AppException(
        HttpStatus.CONFLICT,
        'INVALID_STATUS_TRANSITION',
        `Переход из статуса «${STATUS_LABELS[ticket.status]}» в статус «${STATUS_LABELS[dto.status]}» запрещён`,
      );
    }
    if (!this.policy.canTransition(ticket, dto.status, user)) {
      throw forbidden('Недостаточно прав для смены статуса');
    }
    const updated = await this.tickets.applyStatusChange({
      ticketId: id,
      fromStatus: ticket.status,
      toStatus: dto.status,
      changedById: user.id,
      comment: dto.comment,
      data: this.statusTimestamps(ticket.status, dto.status),
    });
    if (!updated) throw staleTicket();
    await this.recordTicket(user, AuditAction.TICKET_STATUS_CHANGED, updated, {
      from: ticket.status,
      to: dto.status,
    });
    await this.notifications.notify({
      userIds: [updated.authorId, ...(updated.assigneeId ? [updated.assigneeId] : [])],
      ticketId: id,
      type: NotificationType.STATUS_CHANGED,
      title: `Заявка №${updated.number}: статус изменён`,
      body: `Новый статус: ${STATUS_LABELS[dto.status]}`,
      excludeUserId: user.id,
    });
    return this.present(updated, user);
  }

  async assign(id: string, dto: AssignTicketDto, user: AuthUser) {
    const ticket = await this.getAccessible(id, user);
    const assigneeId = dto.assigneeId ?? user.id;
    if (assigneeId === user.id && !dto.assigneeId) {
      this.assertCanTake(ticket, user);
    } else if (!this.policy.canAssign(ticket, user)) {
      throw forbidden('Назначать исполнителя может только руководитель');
    }
    if (ticket.assigneeId === assigneeId) {
      throw new AppException(
        HttpStatus.CONFLICT,
        'ALREADY_ASSIGNED',
        'Заявка уже назначена на этого исполнителя',
      );
    }
    await this.assertAssignableAgent(assigneeId);
    const updated = await this.tickets.applyAssignment({
      ticketId: id,
      fromStatus: ticket.status,
      currentAssigneeId: ticket.assigneeId,
      assigneeId,
      changedById: user.id,
      reactedAt: new Date(),
    });
    if (!updated) throw staleTicket();
    await this.recordTicket(user, AuditAction.TICKET_ASSIGNED, updated, {
      from: ticket.assigneeId,
      to: assigneeId,
    });
    await this.notifications.notify({
      userIds: [assigneeId],
      ticketId: id,
      type: NotificationType.TICKET_ASSIGNED,
      title: `Вам назначена заявка №${updated.number}`,
      body: updated.title,
      excludeUserId: user.id,
    });
    await this.notifications.notify({
      userIds: [updated.authorId],
      ticketId: id,
      type: NotificationType.STATUS_CHANGED,
      title: `Заявка №${updated.number}: назначен исполнитель`,
      body: updated.assignee?.fullName ?? '',
      excludeUserId: user.id,
    });
    return this.present(updated, user);
  }

  async history(id: string, user: AuthUser) {
    await this.getAccessible(id, user);
    return this.tickets.findHistory(id);
  }

  present(ticket: TicketWithRelations, user: AuthUser) {
    return {
      ...toTicketDto(ticket),
      allowedTransitions: this.policy.allowedTransitions(ticket, user),
      canEdit: this.policy.canEdit(ticket, user),
      canDelete: this.policy.canDelete(ticket, user),
      canTake: this.policy.canTake(ticket, user),
      canAssign: this.policy.canAssign(ticket, user),
    };
  }

  private recordTicket(
    user: AuthUser,
    action: AuditActionCode,
    ticket: TicketWithRelations,
    details: Prisma.InputJsonObject,
  ): Promise<void> {
    return this.audit.record({
      actorId: user.id,
      action,
      entityType: 'Ticket',
      entityId: ticket.id,
      details: { number: ticket.number, ...details },
    });
  }

  private assertCanTake(ticket: TicketWithRelations, user: AuthUser): void {
    if (this.policy.canTake(ticket, user)) return;
    if (ticket.assigneeId) {
      throw new AppException(HttpStatus.CONFLICT, 'ALREADY_ASSIGNED', 'Заявка уже назначена');
    }
    if (!hasRole(user, RoleCode.AGENT)) {
      throw new AppException(
        HttpStatus.BAD_REQUEST,
        'ASSIGNEE_REQUIRED',
        'Выберите исполнителя из списка',
      );
    }
    throw new AppException(
      HttpStatus.CONFLICT,
      'TICKET_CHANGED',
      'Эту заявку нельзя взять в работу',
    );
  }

  private async assertAssignableAgent(userId: string): Promise<void> {
    const assignee = await this.users.findById(userId);
    if (!assignee || assignee.isBlocked || !roleCodes(assignee).includes(RoleCode.AGENT)) {
      throw new AppException(
        HttpStatus.BAD_REQUEST,
        'INVALID_ASSIGNEE',
        'Назначить можно только активного исполнителя',
      );
    }
  }

  private async assertActiveCategory(categoryId: number): Promise<void> {
    const category = await this.categories.findById(categoryId);
    if (!category?.isActive) {
      throw new AppException(
        HttpStatus.BAD_REQUEST,
        'INVALID_CATEGORY',
        'Выбранная категория недоступна',
      );
    }
  }

  private async recalculateDeadlines(
    ticket: TicketWithRelations,
    priority: TicketWithRelations['priority'],
  ) {
    const deadlines = await this.sla.calculateDeadlines(priority, ticket.createdAt);
    const now = Date.now();
    return {
      ...deadlines,
      reactionBreachedAt:
        deadlines.reactionDueAt.getTime() > now ? null : ticket.reactionBreachedAt,
      resolutionBreachedAt:
        deadlines.resolutionDueAt.getTime() > now ? null : ticket.resolutionBreachedAt,
    };
  }

  private statusTimestamps(
    from: TicketStatus,
    to: TicketStatus,
  ): Prisma.TicketUncheckedUpdateManyInput {
    if (to === TicketStatus.RESOLVED) return { resolvedAt: new Date() };
    if (to === TicketStatus.CLOSED) return { closedAt: new Date() };
    if (from === TicketStatus.RESOLVED) return { resolvedAt: null };
    return {};
  }

  private buildWhere(query: TicketsQueryDto, user: AuthUser): Prisma.TicketWhereInput {
    const filters: Prisma.TicketWhereInput[] = [this.policy.visibilityFilter(user)];
    if (query.status) filters.push({ status: query.status });
    if (query.priority) filters.push({ priority: query.priority });
    if (query.categoryId) filters.push({ categoryId: query.categoryId });
    if (query.assigneeId) filters.push({ assigneeId: query.assigneeId });
    if (query.assignedToMe) filters.push({ assigneeId: user.id });
    if (query.createdByMe) filters.push({ authorId: user.id });
    if (query.overdue !== undefined) {
      const overdue = this.overdueFilter(new Date());
      filters.push(query.overdue ? overdue : { NOT: overdue });
    }
    const search = query.search?.trim();
    if (search) filters.push(this.searchFilter(search));
    return { AND: filters };
  }

  private overdueFilter(now: Date): Prisma.TicketWhereInput {
    return {
      status: { in: OPEN_STATUSES },
      OR: [
        { resolutionDueAt: { lt: now } },
        { status: TicketStatus.NEW, reactionDueAt: { lt: now } },
      ],
    };
  }

  private searchFilter(search: string): Prisma.TicketWhereInput {
    const conditions: Prisma.TicketWhereInput[] = [
      { title: { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } },
    ];
    if (/^\d{1,9}$/.test(search)) conditions.push({ number: Number(search) });
    return { OR: conditions };
  }
}
