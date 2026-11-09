import { RoleCode, TicketStatus } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { AuthUser } from '../common/auth/auth-user';
import { AppException } from '../common/errors/app.exception';
import { NotificationsService } from '../notifications/notifications.service';
import { TicketsService } from '../tickets/tickets.service';
import { CommentsRepository, CommentWithAuthor } from './comments.repository';
import { CommentsService } from './comments.service';

const user = (id: string, ...roles: RoleCode[]): AuthUser => ({
  id,
  email: `${id}@t.ru`,
  fullName: id,
  roles,
});
const author = user('author', RoleCode.USER);
const manager = user('manager', RoleCode.MANAGER);

const comment = (authorId = 'author'): CommentWithAuthor => ({
  id: 'c1',
  ticketId: 't1',
  authorId,
  body: 'Текст',
  createdAt: new Date(),
  updatedAt: new Date(),
  author: { id: authorId, fullName: authorId, email: `${authorId}@t.ru` },
});

describe('CommentsService', () => {
  let comments: jest.Mocked<CommentsRepository>;
  let tickets: jest.Mocked<Pick<TicketsService, 'getAccessible'>>;
  let notifications: jest.Mocked<Pick<NotificationsService, 'notify'>>;
  let service: CommentsService;

  const openTicket = {
    id: 't1',
    number: 5,
    status: TicketStatus.IN_PROGRESS,
    authorId: 'author',
    assigneeId: 'agent',
  };

  beforeEach(() => {
    comments = {
      findByTicket: jest.fn(),
      findInTicket: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    } as unknown as jest.Mocked<CommentsRepository>;
    tickets = { getAccessible: jest.fn().mockResolvedValue(openTicket) };
    notifications = { notify: jest.fn() };
    service = new CommentsService(
      comments,
      tickets as unknown as TicketsService,
      notifications as unknown as NotificationsService,
      { record: jest.fn() } as unknown as AuditService,
    );
  });

  it('добавляет комментарий и уведомляет вторую сторону', async () => {
    comments.create.mockResolvedValue(comment());
    await service.create('t1', 'Текст', author);
    expect(notifications.notify).toHaveBeenCalledWith(
      expect.objectContaining({ userIds: ['author', 'agent'], excludeUserId: 'author' }),
    );
  });

  it('запрещает комментировать закрытую заявку', async () => {
    tickets.getAccessible.mockResolvedValue({
      ...openTicket,
      status: TicketStatus.CLOSED,
    } as never);
    await expect(service.create('t1', 'Текст', author)).rejects.toBeInstanceOf(AppException);
    expect(comments.create).not.toHaveBeenCalled();
  });

  it('отмечает права в списке', async () => {
    comments.findByTicket.mockResolvedValue([comment('other')]);
    const [row] = await service.list('t1', manager);
    expect(row.canEdit).toBe(false);
    expect(row.canDelete).toBe(true);
  });

  it('разрешает изменять только свой комментарий', async () => {
    comments.findInTicket.mockResolvedValue(comment('other'));
    await expect(service.update('t1', 'c1', 'Новый', author)).rejects.toBeInstanceOf(AppException);
    comments.findInTicket.mockResolvedValue(comment());
    comments.update.mockResolvedValue(comment());
    await service.update('t1', 'c1', 'Новый', author);
    expect(comments.update).toHaveBeenCalledWith('c1', 'Новый');
  });

  it('разрешает руководителю удалить чужой комментарий', async () => {
    comments.findInTicket.mockResolvedValue(comment('other'));
    await service.remove('t1', 'c1', manager);
    expect(comments.delete).toHaveBeenCalledWith('c1');
  });

  it('запрещает пользователю удалить чужой комментарий', async () => {
    comments.findInTicket.mockResolvedValue(comment('other'));
    await expect(service.remove('t1', 'c1', author)).rejects.toBeInstanceOf(AppException);
    expect(comments.delete).not.toHaveBeenCalled();
  });

  it('возвращает 404 для комментария из другой заявки', async () => {
    comments.findInTicket.mockResolvedValue(null);
    const error = await service.update('t1', 'c1', 'x', author).catch((e: AppException) => e);
    expect((error as AppException).getStatus()).toBe(404);
  });
});
