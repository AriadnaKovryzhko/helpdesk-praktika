import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { NotificationType, RoleCode } from '@prisma/client';
import { AppException } from '../common/errors/app.exception';
import { PageResult } from '../common/dto/page-result';
import { NotificationsGateway } from './notifications.gateway';
import { NotificationsRepository } from './notifications.repository';

export interface NotifyInput {
  userIds: string[];
  ticketId: string | null;
  type: NotificationType;
  title: string;
  body: string;
  excludeUserId?: string;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly notifications: NotificationsRepository,
    private readonly gateway: NotificationsGateway,
  ) {}

  // Ошибка рассылки не должна откатывать уже сохранённое изменение заявки.
  async notify(input: NotifyInput): Promise<void> {
    const recipients = [...new Set(input.userIds)].filter((id) => id !== input.excludeUserId);
    if (recipients.length === 0) return;
    try {
      const created = await this.notifications.createMany(
        recipients.map((userId) => ({
          userId,
          ticketId: input.ticketId,
          type: input.type,
          title: input.title,
          body: input.body,
        })),
      );
      created.forEach((notification) => this.gateway.send(notification));
    } catch (error) {
      this.logger.error('Не удалось отправить уведомления', error);
    }
  }

  usersWithRoles(...roles: RoleCode[]): Promise<string[]> {
    return this.notifications.findActiveUserIdsByRoles(roles);
  }

  async list(userId: string, unreadOnly: boolean, page: number, pageSize: number) {
    const [rows, total] = await this.notifications.findPage(
      userId,
      unreadOnly,
      (page - 1) * pageSize,
      pageSize,
    );
    return PageResult.of(rows, total, page, pageSize);
  }

  async unreadCount(userId: string): Promise<{ count: number }> {
    return { count: await this.notifications.countUnread(userId) };
  }

  async markRead(userId: string, id: string): Promise<void> {
    if (!(await this.notifications.markRead(userId, id))) {
      throw new AppException(
        HttpStatus.NOT_FOUND,
        'NOTIFICATION_NOT_FOUND',
        'Уведомление не найдено',
      );
    }
  }

  markAllRead(userId: string): Promise<void> {
    return this.notifications.markAllRead(userId);
  }

  disconnectUser(userId: string): void {
    this.gateway.disconnectUser(userId);
  }
}
