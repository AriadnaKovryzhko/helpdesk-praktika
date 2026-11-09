import { Injectable } from '@nestjs/common';
import { Notification, NotificationType, RoleCode } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export interface NewNotification {
  userId: string;
  ticketId: string | null;
  type: NotificationType;
  title: string;
  body: string;
}

@Injectable()
export class NotificationsRepository {
  constructor(private readonly prisma: PrismaService) {}

  createMany(items: NewNotification[]): Promise<Notification[]> {
    return this.prisma.notification.createManyAndReturn({ data: items });
  }

  async findPage(
    userId: string,
    unreadOnly: boolean,
    skip: number,
    take: number,
  ): Promise<[Notification[], number]> {
    const where = { userId, ...(unreadOnly ? { readAt: null } : {}) };
    return this.prisma.$transaction([
      this.prisma.notification.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take }),
      this.prisma.notification.count({ where }),
    ]);
  }

  countUnread(userId: string): Promise<number> {
    return this.prisma.notification.count({ where: { userId, readAt: null } });
  }

  async markRead(userId: string, id: string): Promise<boolean> {
    const { count } = await this.prisma.notification.updateMany({
      where: { id, userId },
      data: { readAt: new Date() },
    });
    return count === 1;
  }

  async markAllRead(userId: string): Promise<void> {
    await this.prisma.notification.updateMany({
      where: { userId, readAt: null },
      data: { readAt: new Date() },
    });
  }

  async findActiveUserIdsByRoles(roles: RoleCode[]): Promise<string[]> {
    const users = await this.prisma.user.findMany({
      where: { isBlocked: false, roles: { some: { role: { code: { in: roles } } } } },
      select: { id: true },
    });
    return users.map((user) => user.id);
  }
}
