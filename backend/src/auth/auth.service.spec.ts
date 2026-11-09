import { ConfigService } from '@nestjs/config';
import { RoleCode } from '@prisma/client';
import * as argon2 from 'argon2';
import { AppException } from '../common/errors/app.exception';
import { UsersRepository, UserWithRoles } from '../users/users.repository';
import { AuthRepository } from './auth.repository';
import { AuthService } from './auth.service';
import { TokenService } from './token.service';

const refresh = { userId: 'u1', rawToken: 'raw', expiresAt: new Date() };

function userRow(overrides: Partial<UserWithRoles> = {}): UserWithRoles {
  return {
    id: 'u1',
    email: 'a@b.ru',
    passwordHash: 'hash',
    fullName: 'Имя',
    phone: null,
    isBlocked: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    roles: [{ userId: 'u1', roleId: 1, role: { id: 1, code: RoleCode.USER, name: 'x' } }],
    ...overrides,
  };
}

describe('AuthService', () => {
  let users: jest.Mocked<Pick<UsersRepository, 'findByEmail' | 'findById' | 'create'>>;
  let repo: jest.Mocked<
    Pick<
      AuthRepository,
      'replaceResetToken' | 'findResetToken' | 'consumeResetToken' | 'revokeAllForUser'
    >
  >;
  let tokens: jest.Mocked<
    Pick<
      TokenService,
      'signAccessToken' | 'issueRefreshToken' | 'rotateRefreshToken' | 'revokeRefreshToken'
    >
  >;
  let service: AuthService;

  const code = async (promise: Promise<unknown>): Promise<string> => {
    const error = await promise.catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(AppException);
    return (error as AppException).code;
  };

  beforeEach(() => {
    users = { findByEmail: jest.fn(), findById: jest.fn(), create: jest.fn() };
    repo = {
      replaceResetToken: jest.fn(),
      findResetToken: jest.fn(),
      consumeResetToken: jest.fn(),
      revokeAllForUser: jest.fn(),
    };
    tokens = {
      signAccessToken: jest.fn().mockResolvedValue('access'),
      issueRefreshToken: jest.fn().mockResolvedValue(refresh),
      rotateRefreshToken: jest.fn().mockResolvedValue(refresh),
      revokeRefreshToken: jest.fn(),
    };
    service = new AuthService(
      users as unknown as UsersRepository,
      repo as unknown as AuthRepository,
      tokens as unknown as TokenService,
      { getOrThrow: () => 'http://app' } as unknown as ConfigService,
    );
  });

  it('приводит email к нижнему регистру и хэширует пароль при регистрации', async () => {
    users.findByEmail.mockResolvedValue(null);
    users.create.mockResolvedValue(userRow());
    await service.register({ email: ' A@B.RU ', password: 'Secret123', fullName: ' Имя ' });
    const created = users.create.mock.calls[0][0];
    expect(created.email).toBe('a@b.ru');
    expect(created.role).toBe(RoleCode.USER);
    expect(created.passwordHash).not.toBe('Secret123');
    expect(await argon2.verify(created.passwordHash, 'Secret123')).toBe(true);
  });

  it('отклоняет занятый email', async () => {
    users.findByEmail.mockResolvedValue(userRow());
    expect(await code(service.register({ email: 'a@b.ru', password: 'x', fullName: 'y' }))).toBe(
      'EMAIL_TAKEN',
    );
  });

  it('входит при верном пароле', async () => {
    users.findByEmail.mockResolvedValue(userRow({ passwordHash: await argon2.hash('Secret123') }));
    const session = await service.login({ email: 'a@b.ru', password: 'Secret123' });
    expect(session.accessToken).toBe('access');
  });

  it('не различает неизвестный email и неверный пароль', async () => {
    users.findByEmail.mockResolvedValue(null);
    expect(await code(service.login({ email: 'x@y.ru', password: 'Secret123' }))).toBe(
      'INVALID_CREDENTIALS',
    );
    users.findByEmail.mockResolvedValue(userRow({ passwordHash: await argon2.hash('Other1234') }));
    expect(await code(service.login({ email: 'a@b.ru', password: 'Secret123' }))).toBe(
      'INVALID_CREDENTIALS',
    );
  });

  it('не пускает заблокированного пользователя', async () => {
    users.findByEmail.mockResolvedValue(
      userRow({ passwordHash: await argon2.hash('Secret123'), isBlocked: true }),
    );
    expect(await code(service.login({ email: 'a@b.ru', password: 'Secret123' }))).toBe(
      'ACCOUNT_BLOCKED',
    );
  });

  it('завершает сессию заблокированного при обновлении токена', async () => {
    users.findById.mockResolvedValue(userRow({ isBlocked: true }));
    expect(await code(service.refresh('raw'))).toBe('INVALID_SESSION');
    expect(repo.revokeAllForUser).toHaveBeenCalledWith('u1');
  });

  it('молча завершает запрос восстановления для неизвестного email', async () => {
    users.findByEmail.mockResolvedValue(null);
    await service.forgotPassword('none@b.ru');
    expect(repo.replaceResetToken).not.toHaveBeenCalled();
  });

  it('создаёт токен восстановления для известного email', async () => {
    users.findByEmail.mockResolvedValue(userRow());
    await service.forgotPassword('a@b.ru');
    expect(repo.replaceResetToken).toHaveBeenCalledTimes(1);
  });

  it('отклоняет устаревший токен восстановления', async () => {
    repo.findResetToken.mockResolvedValue({
      id: 't',
      userId: 'u1',
      tokenHash: 'h',
      expiresAt: new Date(Date.now() - 1000),
      usedAt: null,
      createdAt: new Date(),
    });
    expect(await code(service.resetPassword({ token: 'x', password: 'Secret123' }))).toBe(
      'INVALID_RESET_TOKEN',
    );
  });

  it('меняет пароль по действующему токену', async () => {
    repo.findResetToken.mockResolvedValue({
      id: 't',
      userId: 'u1',
      tokenHash: 'h',
      expiresAt: new Date(Date.now() + 60_000),
      usedAt: null,
      createdAt: new Date(),
    });
    repo.consumeResetToken.mockResolvedValue(true);
    await service.resetPassword({ token: 'x', password: 'Secret123' });
    expect(repo.consumeResetToken).toHaveBeenCalledWith('t', 'u1', expect.any(String));
  });
});
