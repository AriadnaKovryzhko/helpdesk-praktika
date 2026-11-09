import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RoleCode } from '@prisma/client';
import * as argon2 from 'argon2';
import { AuditAction } from '../audit/audit.actions';
import { AuditService } from '../audit/audit.service';
import { AppException } from '../common/errors/app.exception';
import { toUserDto, UserDto } from '../users/user.presenter';
import { UsersRepository } from '../users/users.repository';
import { AuthRepository } from './auth.repository';
import { LoginDto, RegisterDto, ResetPasswordDto } from './dto/auth.dto';
import { randomToken, RotatedRefreshToken, sha256, TokenService } from './token.service';

export interface Session {
  accessToken: string;
  user: UserDto;
  refresh: RotatedRefreshToken;
}

const RESET_TOKEN_TTL_MS = 60 * 60 * 1000;

const invalidCredentials = () =>
  new AppException(HttpStatus.UNAUTHORIZED, 'INVALID_CREDENTIALS', 'Неверный email или пароль');

const invalidResetToken = () =>
  new AppException(
    HttpStatus.BAD_REQUEST,
    'INVALID_RESET_TOKEN',
    'Ссылка для восстановления недействительна или устарела',
  );

export const normalizeEmail = (email: string): string => email.trim().toLowerCase();

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  // Проверка по этому хэшу уравнивает время ответа для неизвестного и известного email.
  private readonly dummyHash = argon2.hash(randomToken());

  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly authRepository: AuthRepository,
    private readonly tokens: TokenService,
    private readonly config: ConfigService,
    private readonly audit: AuditService,
  ) {}

  async register(dto: RegisterDto): Promise<Session> {
    const email = normalizeEmail(dto.email);
    if (await this.usersRepository.findByEmail(email)) {
      throw new AppException(
        HttpStatus.CONFLICT,
        'EMAIL_TAKEN',
        'Пользователь с таким email уже зарегистрирован',
      );
    }
    const user = await this.usersRepository.create({
      email,
      fullName: dto.fullName.trim(),
      passwordHash: await argon2.hash(dto.password),
      role: RoleCode.USER,
    });
    await this.audit.record({
      actorId: user.id,
      action: AuditAction.USER_REGISTERED,
      entityType: 'User',
      entityId: user.id,
    });
    return this.openSession(user.id, toUserDto(user));
  }

  async login(dto: LoginDto): Promise<Session> {
    const user = await this.usersRepository.findByEmail(normalizeEmail(dto.email));
    const passwordMatches = await argon2.verify(
      user?.passwordHash ?? (await this.dummyHash),
      dto.password,
    );
    if (!user || !passwordMatches) {
      await this.audit.record({
        actorId: user?.id ?? null,
        action: AuditAction.LOGIN_FAILED,
        entityType: 'User',
        entityId: user?.id,
        details: { email: normalizeEmail(dto.email) },
      });
      throw invalidCredentials();
    }
    if (user.isBlocked) {
      throw new AppException(
        HttpStatus.FORBIDDEN,
        'ACCOUNT_BLOCKED',
        'Учётная запись заблокирована. Обратитесь к руководителю',
      );
    }
    await this.audit.record({
      actorId: user.id,
      action: AuditAction.LOGIN_SUCCESS,
      entityType: 'User',
      entityId: user.id,
    });
    return this.openSession(user.id, toUserDto(user));
  }

  async refresh(rawToken: string | undefined): Promise<Session> {
    const refresh = await this.tokens.rotateRefreshToken(rawToken);
    const user = await this.usersRepository.findById(refresh.userId);
    if (!user || user.isBlocked) {
      await this.authRepository.revokeAllForUser(refresh.userId);
      throw new AppException(HttpStatus.UNAUTHORIZED, 'INVALID_SESSION', 'Сессия завершена');
    }
    return {
      accessToken: await this.tokens.signAccessToken(user.id),
      user: toUserDto(user),
      refresh,
    };
  }

  logout(rawToken: string | undefined): Promise<void> {
    return this.tokens.revokeRefreshToken(rawToken);
  }

  async forgotPassword(emailInput: string): Promise<void> {
    const user = await this.usersRepository.findByEmail(normalizeEmail(emailInput));
    if (!user || user.isBlocked) return;
    const rawToken = randomToken();
    await this.authRepository.replaceResetToken({
      userId: user.id,
      tokenHash: sha256(rawToken),
      expiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MS),
    });
    const appUrl = this.config.getOrThrow<string>('APP_URL');
    this.logger.log(`Ссылка для восстановления пароля: ${appUrl}/reset-password?token=${rawToken}`);
  }

  async resetPassword(dto: ResetPasswordDto): Promise<void> {
    const token = await this.authRepository.findResetToken(sha256(dto.token));
    if (!token || token.usedAt || token.expiresAt.getTime() <= Date.now()) {
      throw invalidResetToken();
    }
    const passwordHash = await argon2.hash(dto.password);
    if (!(await this.authRepository.consumeResetToken(token.id, token.userId, passwordHash))) {
      throw invalidResetToken();
    }
    await this.audit.record({
      actorId: token.userId,
      action: AuditAction.PASSWORD_RESET,
      entityType: 'User',
      entityId: token.userId,
    });
  }

  private async openSession(userId: string, user: UserDto): Promise<Session> {
    const [accessToken, refresh] = await Promise.all([
      this.tokens.signAccessToken(userId),
      this.tokens.issueRefreshToken(userId),
    ]);
    return { accessToken, user, refresh };
  }
}
