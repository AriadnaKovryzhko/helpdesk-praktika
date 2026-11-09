import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { NotificationType, RoleCode, TicketPriority } from '@prisma/client';
import { AppException } from '../common/errors/app.exception';
import { NotificationsService } from '../notifications/notifications.service';
import { SlaPoliciesRepository } from '../sla-policies/sla-policies.repository';
import { OPEN_STATUSES } from './ticket-status';
import { TicketsRepository, TicketWithRelations } from './tickets.repository';

const MINUTE_MS = 60_000;

export interface SlaDeadlines {
  reactionDueAt: Date;
  resolutionDueAt: Date;
}

@Injectable()
export class SlaService {
  private readonly logger = new Logger(SlaService.name);

  constructor(
    private readonly policies: SlaPoliciesRepository,
    private readonly tickets: TicketsRepository,
    private readonly notifications: NotificationsService,
  ) {}

  async calculateDeadlines(priority: TicketPriority, from: Date): Promise<SlaDeadlines> {
    const policy = await this.policies.findByPriority(priority);
    if (!policy) {
      throw new AppException(
        HttpStatus.BAD_REQUEST,
        'SLA_POLICY_MISSING',
        'Для выбранного приоритета не настроена SLA-политика',
      );
    }
    return {
      reactionDueAt: new Date(from.getTime() + policy.reactionMinutes * MINUTE_MS),
      resolutionDueAt: new Date(from.getTime() + policy.resolutionMinutes * MINUTE_MS),
    };
  }

  async markBreaches(now = new Date()): Promise<number> {
    let marked = 0;
    for (const ticket of await this.tickets.findReactionBreaches(now)) {
      if (await this.tickets.markReactionBreached(ticket.id, now)) {
        marked += 1;
        await this.notifyBreach(ticket, 'реакции', [RoleCode.AGENT, RoleCode.MANAGER]);
      }
    }
    for (const ticket of await this.tickets.findResolutionBreaches(now, OPEN_STATUSES)) {
      if (await this.tickets.markResolutionBreached(ticket.id, now)) {
        marked += 1;
        await this.notifyBreach(ticket, 'решения', [RoleCode.MANAGER]);
      }
    }
    if (marked > 0) this.logger.log(`Отмечено просрочек SLA: ${marked}`);
    return marked;
  }

  private async notifyBreach(
    ticket: TicketWithRelations,
    deadlineName: string,
    roles: RoleCode[],
  ): Promise<void> {
    const staff = await this.notifications.usersWithRoles(...roles);
    await this.notifications.notify({
      userIds: [...staff, ...(ticket.assigneeId ? [ticket.assigneeId] : [])],
      ticketId: ticket.id,
      type: NotificationType.SLA_BREACHED,
      title: `Просрочен срок ${deadlineName} по заявке №${ticket.number}`,
      body: ticket.title,
    });
  }
}
