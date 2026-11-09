import { Notification, NotificationType } from '@prisma/client';
import { AppException } from '../common/errors/app.exception';
import { NotificationsGateway } from './notifications.gateway';
import { NotificationsRepository } from './notifications.repository';
import { NotificationsService } from './notifications.service';

describe('NotificationsService', () => {
  let repo: jest.Mocked<NotificationsRepository>;
  let gateway: jest.Mocked<Pick<NotificationsGateway, 'send' | 'disconnectUser'>>;
  let service: NotificationsService;

  const input = {
    ticketId: 't1',
    type: NotificationType.STATUS_CHANGED,
    title: 'Заголовок',
    body: 'Текст',
  };

  beforeEach(() => {
    repo = {
      createMany: jest.fn(),
      findPage: jest.fn(),
      countUnread: jest.fn(),
      markRead: jest.fn(),
      markAllRead: jest.fn(),
      findActiveUserIdsByRoles: jest.fn(),
    } as unknown as jest.Mocked<NotificationsRepository>;
    gateway = { send: jest.fn(), disconnectUser: jest.fn() };
    service = new NotificationsService(repo, gateway as unknown as NotificationsGateway);
  });

  it('убирает дубликаты и инициатора, затем отправляет в сокет', async () => {
    const saved = [{ id: 'n1', userId: 'a' }] as Notification[];
    repo.createMany.mockResolvedValue(saved);
    await service.notify({ ...input, userIds: ['a', 'a', 'me'], excludeUserId: 'me' });
    expect(repo.createMany.mock.calls[0][0].map((item) => item.userId)).toEqual(['a']);
    expect(gateway.send).toHaveBeenCalledWith(saved[0]);
  });

  it('ничего не делает без получателей', async () => {
    await service.notify({ ...input, userIds: ['me'], excludeUserId: 'me' });
    expect(repo.createMany).not.toHaveBeenCalled();
  });

  it('не передаёт ошибку рассылки вызывающему коду', async () => {
    repo.createMany.mockRejectedValue(new Error('сбой'));
    await expect(service.notify({ ...input, userIds: ['a'] })).resolves.toBeUndefined();
  });

  it('возвращает страницу уведомлений', async () => {
    repo.findPage.mockResolvedValue([[], 25]);
    const result = await service.list('u', true, 2, 10);
    expect(repo.findPage).toHaveBeenCalledWith('u', true, 10, 10);
    expect(result.meta.totalPages).toBe(3);
  });

  it('считает непрочитанные', async () => {
    repo.countUnread.mockResolvedValue(4);
    expect(await service.unreadCount('u')).toEqual({ count: 4 });
  });

  it('не отмечает чужое уведомление', async () => {
    repo.markRead.mockResolvedValue(false);
    await expect(service.markRead('u', 'n')).rejects.toBeInstanceOf(AppException);
  });
});
