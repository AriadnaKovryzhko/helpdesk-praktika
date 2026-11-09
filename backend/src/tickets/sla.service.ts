import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { TicketPriority } from '@prisma/client';
import { AppException } from '../common/errors/app.exception';
import { SlaPoliciesRepository } from '../sla-policies/sla-policies.repository';
import { OPEN_STATUSES } from './ticket-status';
import { TicketsRepository } from './tickets.repository';

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
      if (await this.tickets.markReactionBreached(ticket.id, now)) marked += 1;
    }
    for (const ticket of await this.tickets.findResolutionBreaches(now, OPEN_STATUSES)) {
      if (await this.tickets.markResolutionBreached(ticket.id, now)) marked += 1;
    }
    if (marked > 0) this.logger.log(`Отмечено просрочек SLA: ${marked}`);
    return marked;
  }
}
