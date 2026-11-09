import { HttpStatus, Injectable } from '@nestjs/common';
import { NotificationType, RoleCode, TicketStatus } from '@prisma/client';
import { AuditAction } from '../audit/audit.actions';
import { AuditService } from '../audit/audit.service';
import { AuthUser, hasRole } from '../common/auth/auth-user';
import { AppException } from '../common/errors/app.exception';
import { NotificationsService } from '../notifications/notifications.service';
import { TicketsService } from '../tickets/tickets.service';
import { CommentsRepository, CommentWithAuthor } from './comments.repository';

@Injectable()
export class CommentsService {
  constructor(
    private readonly comments: CommentsRepository,
    private readonly tickets: TicketsService,
    private readonly notifications: NotificationsService,
    private readonly audit: AuditService,
  ) {}

  async list(ticketId: string, user: AuthUser) {
    await this.tickets.getAccessible(ticketId, user);
    const rows = await this.comments.findByTicket(ticketId);
    return rows.map((row) => this.present(row, user));
  }

  async create(ticketId: string, body: string, user: AuthUser) {
    const ticket = await this.tickets.getAccessible(ticketId, user);
    if (ticket.status === TicketStatus.CLOSED) {
      throw new AppException(
        HttpStatus.CONFLICT,
        'TICKET_CLOSED',
        'Заявка закрыта, добавить комментарий нельзя',
      );
    }
    const comment = await this.comments.create(ticketId, user.id, body);
    await this.notifications.notify({
      userIds: [ticket.authorId, ...(ticket.assigneeId ? [ticket.assigneeId] : [])],
      ticketId,
      type: NotificationType.COMMENT_ADDED,
      title: `Новый комментарий к заявке №${ticket.number}`,
      body: body.slice(0, 200),
      excludeUserId: user.id,
    });
    return this.present(comment, user);
  }

  async update(ticketId: string, commentId: string, body: string, user: AuthUser) {
    const comment = await this.getInTicket(ticketId, commentId, user);
    if (comment.authorId !== user.id) {
      throw new AppException(
        HttpStatus.FORBIDDEN,
        'FORBIDDEN',
        'Изменить комментарий может только его автор',
      );
    }
    return this.present(await this.comments.update(commentId, body), user);
  }

  async remove(ticketId: string, commentId: string, user: AuthUser): Promise<void> {
    const comment = await this.getInTicket(ticketId, commentId, user);
    if (comment.authorId !== user.id && !hasRole(user, RoleCode.MANAGER)) {
      throw new AppException(
        HttpStatus.FORBIDDEN,
        'FORBIDDEN',
        'Удалить комментарий может автор или руководитель',
      );
    }
    await this.comments.delete(commentId);
    await this.audit.record({
      actorId: user.id,
      action: AuditAction.COMMENT_DELETED,
      entityType: 'TicketComment',
      entityId: commentId,
      details: { ticketId },
    });
  }

  private async getInTicket(
    ticketId: string,
    commentId: string,
    user: AuthUser,
  ): Promise<CommentWithAuthor> {
    await this.tickets.getAccessible(ticketId, user);
    const comment = await this.comments.findInTicket(ticketId, commentId);
    if (!comment) {
      throw new AppException(HttpStatus.NOT_FOUND, 'COMMENT_NOT_FOUND', 'Комментарий не найден');
    }
    return comment;
  }

  private present(comment: CommentWithAuthor, user: AuthUser) {
    return {
      id: comment.id,
      body: comment.body,
      author: comment.author,
      canEdit: comment.authorId === user.id,
      canDelete: comment.authorId === user.id || hasRole(user, RoleCode.MANAGER),
      createdAt: comment.createdAt,
      updatedAt: comment.updatedAt,
    };
  }
}
