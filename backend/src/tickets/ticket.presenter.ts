import { Ticket, TicketStatus } from '@prisma/client';
import { OPEN_STATUSES } from './ticket-status';
import { TicketWithRelations } from './tickets.repository';

export function isTicketOverdue(
  ticket: Pick<Ticket, 'status' | 'reactionDueAt' | 'resolutionDueAt'>,
  now: Date,
): boolean {
  if (!OPEN_STATUSES.includes(ticket.status)) return false;
  return (
    ticket.resolutionDueAt.getTime() < now.getTime() ||
    (ticket.status === TicketStatus.NEW && ticket.reactionDueAt.getTime() < now.getTime())
  );
}

export function toTicketDto(ticket: TicketWithRelations, now = new Date()) {
  return {
    id: ticket.id,
    number: ticket.number,
    title: ticket.title,
    description: ticket.description,
    status: ticket.status,
    priority: ticket.priority,
    category: ticket.category,
    author: ticket.author,
    assignee: ticket.assignee,
    reactionDueAt: ticket.reactionDueAt,
    resolutionDueAt: ticket.resolutionDueAt,
    reactedAt: ticket.reactedAt,
    resolvedAt: ticket.resolvedAt,
    closedAt: ticket.closedAt,
    reactionBreachedAt: ticket.reactionBreachedAt,
    resolutionBreachedAt: ticket.resolutionBreachedAt,
    isOverdue: isTicketOverdue(ticket, now),
    createdAt: ticket.createdAt,
    updatedAt: ticket.updatedAt,
  };
}

export type TicketDto = ReturnType<typeof toTicketDto>;
