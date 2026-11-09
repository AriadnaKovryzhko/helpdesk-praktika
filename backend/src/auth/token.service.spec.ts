import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { RefreshToken } from '@prisma/client';
import { AppException } from '../common/errors/app.exception';
import { UsersRepository } from '../users/users.repository';
import { AuthRepository } from './auth.repository';
import { sha256, TokenService } from './token.service';

function stored(overrides: Partial<RefreshToken> = {}): RefreshToken {
  return {
    id: 'r1',
    userId: 'u1',
    familyId: 'f1',
    tokenHash: 'h',
    expiresAt: new Date(Date.now() + 60_000),
    revokedAt: null,
    createdAt: new Date(),
    ...overrides,
  };
}

describe('TokenService', () => {
  let repo: jest.Mocked<
    Pick<
      AuthRepository,
      'findRefreshToken' | 'revokeIfActive' | 'revokeFamily' | 'createRefreshToken'
    >
  >;
  let users: jest.Mocked<Pick<UsersRepository, 'findById'>>;
  let jwt: jest.Mocked<Pick<JwtService, 'signAsync' | 'verifyAsync'>>;
  let service: TokenService;

  beforeEach(() => {
    repo = {
      findRefreshToken: jest.fn(),
      revokeIfActive: jest.fn().mockResolvedValue(true),
      revokeFamily: jest.fn(),
      createRefreshToken: jest.fn(),
    };
    users = { findById: jest.fn() };
    jwt = { signAsync: jest.fn(), verifyAsync: jest.fn() };
    service = new TokenService(
      jwt as unknown as JwtService,
      { get: () => 30 } as unknown as ConfigService,
      repo as unknown as AuthRepository,
      users as unknown as UsersRepository,
    );
  });

  it('хранит только хэш refresh-токена', async () => {
    const { rawToken } = await service.issueRefreshToken('u1');
    expect(repo.createRefreshToken.mock.calls[0][0].tokenHash).toBe(sha256(rawToken));
  });

  it('выдаёт новый токен той же цепочки при ротации', async () => {
    repo.findRefreshToken.mockResolvedValue(stored());
    await service.rotateRefreshToken('raw');
    expect(repo.revokeIfActive).toHaveBeenCalledWith('r1');
    expect(repo.createRefreshToken.mock.calls[0][0].familyId).toBe('f1');
  });

  it('отзывает цепочку при повторном использовании старого токена', async () => {
    repo.findRefreshToken.mockResolvedValue(stored({ revokedAt: new Date(Date.now() - 60_000) }));
    await expect(service.rotateRefreshToken('raw')).rejects.toBeInstanceOf(AppException);
    expect(repo.revokeFamily).toHaveBeenCalledWith('f1');
  });

  it('не отзывает цепочку при почти одновременных запросах', async () => {
    repo.findRefreshToken.mockResolvedValue(stored({ revokedAt: new Date() }));
    await expect(service.rotateRefreshToken('raw')).rejects.toBeInstanceOf(AppException);
    expect(repo.revokeFamily).not.toHaveBeenCalled();
  });

  it('отклоняет просроченный токен', async () => {
    repo.findRefreshToken.mockResolvedValue(stored({ expiresAt: new Date(Date.now() - 1) }));
    await expect(service.rotateRefreshToken('raw')).rejects.toBeInstanceOf(AppException);
    expect(repo.revokeIfActive).not.toHaveBeenCalled();
  });

  it('отклоняет запрос без токена доступа', async () => {
    await expect(service.authenticateAccessToken(undefined)).rejects.toBeInstanceOf(AppException);
  });
});
