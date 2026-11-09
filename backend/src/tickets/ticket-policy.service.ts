import { Injectable } from '@nestjs/common';
import { Prisma, RoleCode, Ticket, TicketStatus } from '@prisma/client';
import { AuthUser, hasRole } from '../common/auth/auth-user';
import { OPEN_STATUSES, TRANSITIONS } from './ticket-status';

type TicketAccessFields = Pick<Ticket, 'status' | 'authorId' | 'assigneeId'>;

@Injectable()
export class TicketPolicyService {
  visibilityFilter(user: AuthUser): Prisma.TicketWhereInput {
    if (hasRole(user, RoleCode.MANAGER)) return {};
    if (hasRole(user, RoleCode.AGENT)) {
      return { OR: [{ authorId: user.id }, { assigneeId: user.id }, { assigneeId: null }] };
    }
    return { authorId: user.id };
  }

  canView(ticket: TicketAccessFields, user: AuthUser): boolean {
    return (
      hasRole(user, RoleCode.MANAGER) ||
      ticket.authorId === user.id ||
      ticket.assigneeId === user.id ||
      (hasRole(user, RoleCode.AGENT) && ticket.assigneeId === null)
    );
  }

  isResponsible(ticket: TicketAccessFields, user: AuthUser): boolean {
    if (ticket.authorId === user.id) return false;
    return hasRole(user, RoleCode.MANAGER) || ticket.assigneeId === user.id;
  }

  canEdit(ticket: TicketAccessFields, user: AuthUser): boolean {
    if (ticket.status === TicketStatus.CLOSED) return false;
    return (
      this.isResponsible(ticket, user) ||
      (ticket.authorId === user.id && ticket.status === TicketStatus.NEW)
    );
  }

  canDelete(ticket: TicketAccessFields, user: AuthUser): boolean {
    return (
      hasRole(user, RoleCode.MANAGER) ||
      (ticket.authorId === user.id && ticket.status === TicketStatus.NEW)
    );
  }

  canTake(ticket: TicketAccessFields, user: AuthUser): boolean {
    return (
      hasRole(user, RoleCode.AGENT) &&
      ticket.authorId !== user.id &&
      ticket.status === TicketStatus.NEW &&
      ticket.assigneeId === null
    );
  }

  canAssign(ticket: TicketAccessFields, user: AuthUser): boolean {
    return (
      hasRole(user, RoleCode.MANAGER) &&
      ticket.authorId !== user.id &&
      OPEN_STATUSES.includes(ticket.status)
    );
  }

  canTransition(ticket: TicketAccessFields, target: TicketStatus, user: AuthUser): boolean {
    if (this.isResponsible(ticket, user)) return true;
    if (ticket.authorId !== user.id) return false;
    return ticket.status === TicketStatus.WAITING_USER || ticket.status === TicketStatus.RESOLVED
      ? TRANSITIONS[ticket.status].includes(target)
      : false;
  }

  allowedTransitions(ticket: TicketAccessFields, user: AuthUser): TicketStatus[] {
    return TRANSITIONS[ticket.status].filter(
      (target) => target !== TicketStatus.ASSIGNED && this.canTransition(ticket, target, user),
    );
  }
}
