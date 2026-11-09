import { RoleCode } from '@prisma/client';
import * as argon2 from 'argon2';
import { AuditService } from '../audit/audit.service';
import { AuthUser } from '../common/auth/auth-user';
import { AppException } from '../common/errors/app.exception';
import { NotificationsService } from '../notifications/notifications.service';
import { UsersRepository, UserWithRoles } from './users.repository';
import { UsersService } from './users.service';

const manager: AuthUser = { id: 'm', email: 'm@t.ru', fullName: 'm', roles: [RoleCode.MANAGER] };

function row(overrides: Partial<UserWithRoles> = {}): UserWithRoles {
  return {
    id: 'u',
    email: 'u@t.ru',
    passwordHash: 'x',
    fullName: 'u',
    phone: null,
    isBlocked: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    roles: [{ userId: 'u', roleId: 1, role: { id: 1, code: RoleCode.USER, name: 'x' } }],
    ...overrides,
  };
}

describe('UsersService', () => {
  let users: jest.Mocked<UsersRepository>;
  let notifications: jest.Mocked<Pick<NotificationsService, 'disconnectUser'>>;
  let service: UsersService;

  const code = async (promise: Promise<unknown>) => {
    const error = await promise.catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(AppException);
    return (error as AppException).code;
  };

  beforeEach(() => {
    users = {
      findById: jest.fn().mockResolvedValue(row()),
      findPage: jest.fn(),
      findActiveByRole: jest.fn(),
      updateProfile: jest.fn().mockResolvedValue(row()),
      updatePassword: jest.fn(),
      replaceRoles: jest.fn().mockResolvedValue(row()),
      setBlocked: jest.fn().mockResolvedValue(row({ isBlocked: true })),
    } as unknown as jest.Mocked<UsersRepository>;
    notifications = { disconnectUser: jest.fn() };
    service = new UsersService(
      users,
      { record: jest.fn() } as unknown as AuditService,
      notifications as unknown as NotificationsService,
    );
  });

  it('строит фильтры и пагинацию списка', async () => {
    users.findPage.mockResolvedValue([[row()], 1]);
    const result = await service.list({
      page: 1,
      pageSize: 20,
      sortBy: 'email',
      sortOrder: 'asc',
      role: RoleCode.AGENT,
      isBlocked: false,
      search: 'иван',
    });
    expect(result.meta.total).toBe(1);
    const [where, orderBy] = users.findPage.mock.calls[0];
    expect(orderBy).toEqual({ email: 'asc' });
    expect(where.isBlocked).toBe(false);
    expect(where.OR).toHaveLength(2);
  });

  it('заменяет пустой телефон на null', async () => {
    await service.updateProfile(manager, { phone: '' });
    expect(users.updateProfile).toHaveBeenCalledWith('m', { fullName: undefined, phone: null });
  });

  it('меняет пароль при верном текущем', async () => {
    users.findById.mockResolvedValue(row({ passwordHash: await argon2.hash('Current12') }));
    await service.changePassword(manager, {
      currentPassword: 'Current12',
      newPassword: 'New123456',
    });
    expect(users.updatePassword).toHaveBeenCalledTimes(1);
  });

  it('отклоняет неверный текущий пароль', async () => {
    users.findById.mockResolvedValue(row({ passwordHash: await argon2.hash('Current12') }));
    expect(
      await code(
        service.changePassword(manager, { currentPassword: 'Wrong1234', newPassword: 'New123456' }),
      ),
    ).toBe('INVALID_CURRENT_PASSWORD');
  });

  it('меняет роли пользователя', async () => {
    await service.updateRoles('u', { roles: [RoleCode.AGENT] }, manager);
    expect(users.replaceRoles).toHaveBeenCalledWith('u', [RoleCode.AGENT]);
  });

  it('не даёт руководителю снять с себя роль', async () => {
    expect(await code(service.updateRoles('m', { roles: [RoleCode.USER] }, manager))).toBe(
      'CANNOT_DEMOTE_SELF',
    );
  });

  it('блокирует пользователя и разрывает его WebSocket-соединения', async () => {
    const result = await service.block('u', manager);
    expect(result.isBlocked).toBe(true);
    expect(users.setBlocked).toHaveBeenCalledWith('u', true);
    expect(notifications.disconnectUser).toHaveBeenCalledWith('u');
  });

  it('не даёт заблокировать самого себя', async () => {
    expect(await code(service.block('m', manager))).toBe('CANNOT_BLOCK_SELF');
  });

  it('разблокирует пользователя', async () => {
    users.setBlocked.mockResolvedValue(row());
    expect((await service.unblock('u', manager)).isBlocked).toBe(false);
  });

  it('сообщает об отсутствии пользователя', async () => {
    users.findById.mockResolvedValue(null);
    expect(await code(service.get('none'))).toBe('USER_NOT_FOUND');
  });
});
