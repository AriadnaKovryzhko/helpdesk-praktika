import { HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { createHash, randomBytes, randomUUID } from 'crypto';
import { AuthUser } from '../common/auth/auth-user';
import { AppException } from '../common/errors/app.exception';
import { toAuthUser } from '../users/user.presenter';
import { UsersRepository } from '../users/users.repository';
import { AuthRepository } from './auth.repository';

interface AccessPayload {
  sub: string;
}

export interface RotatedRefreshToken {
  userId: string;
  rawToken: string;
  expiresAt: Date;
}

const DAY_MS = 24 * 60 * 60 * 1000;
// Параллельные запросы из вкладок могут предъявить только что заменённый токен: это не кража.
const REUSE_GRACE_MS = 10_000;

export const sha256 = (value: string): string => createHash('sha256').update(value).digest('hex');
export const randomToken = (): string => randomBytes(32).toString('base64url');

const invalidSession = () =>
  new AppException(HttpStatus.UNAUTHORIZED, 'INVALID_SESSION', 'Сессия истекла, войдите снова');

@Injectable()
export class TokenService {
  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly authRepository: AuthRepository,
    private readonly usersRepository: UsersRepository,
  ) {}

  signAccessToken(userId: string): Promise<string> {
    const payload: AccessPayload = { sub: userId };
    return this.jwt.signAsync(payload);
  }

  async verifyAccessToken(token: string | undefined): Promise<string> {
    if (!token) throw invalidSession();
    try {
      const { sub } = await this.jwt.verifyAsync<AccessPayload>(token);
      return sub;
    } catch {
      throw invalidSession();
    }
  }

  // Пользователь читается из базы при каждом запросе, чтобы блокировка и смена ролей действовали сразу.
  async authenticateAccessToken(token: string | undefined): Promise<AuthUser> {
    const userId = await this.verifyAccessToken(token);
    const user = await this.usersRepository.findById(userId);
    if (!user) throw invalidSession();
    if (user.isBlocked) {
      throw new AppException(
        HttpStatus.UNAUTHORIZED,
        'ACCOUNT_BLOCKED',
        'Учётная запись заблокирована',
      );
    }
    return toAuthUser(user);
  }

  async issueRefreshToken(userId: string, familyId: string = randomUUID()): Promise<RotatedRefreshToken> {
    const rawToken = randomToken();
    const expiresAt = new Date(Date.now() + this.refreshTtlDays() * DAY_MS);
    await this.authRepository.createRefreshToken({
      userId,
      familyId,
      tokenHash: sha256(rawToken),
      expiresAt,
    });
    return { userId, rawToken, expiresAt };
  }

  async rotateRefreshToken(rawToken: string | undefined): Promise<RotatedRefreshToken> {
    if (!rawToken) throw invalidSession();
    const stored = await this.authRepository.findRefreshToken(sha256(rawToken));
    if (!stored || stored.expiresAt.getTime() <= Date.now()) throw invalidSession();

    if (stored.revokedAt) {
      if (Date.now() - stored.revokedAt.getTime() > REUSE_GRACE_MS) {
        await this.authRepository.revokeFamily(stored.familyId);
      }
      throw invalidSession();
    }
    if (!(await this.authRepository.revokeIfActive(stored.id))) throw invalidSession();
    return this.issueRefreshToken(stored.userId, stored.familyId);
  }

  async revokeRefreshToken(rawToken: string | undefined): Promise<void> {
    if (!rawToken) return;
    const stored = await this.authRepository.findRefreshToken(sha256(rawToken));
    if (stored) await this.authRepository.revokeFamily(stored.familyId);
  }

  private refreshTtlDays(): number {
    return Number(this.config.get('REFRESH_TTL_DAYS') ?? 30);
  }
}
