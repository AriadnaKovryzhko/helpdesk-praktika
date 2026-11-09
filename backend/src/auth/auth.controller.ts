import { Body, Controller, HttpCode, HttpStatus, Post, Req, Res } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { CookieOptions, Request, Response } from 'express';
import { Public } from '../common/auth/decorators';
import { UserDto } from '../users/user.presenter';
import { AuthService, Session } from './auth.service';
import { ForgotPasswordDto, LoginDto, RegisterDto, ResetPasswordDto } from './dto/auth.dto';

export const REFRESH_COOKIE = 'refresh_token';
const COOKIE_PATH = '/api/auth';
const authLimit = () => ({
  default: { limit: Number(process.env.AUTH_THROTTLE_LIMIT ?? 20), ttl: 60_000 },
});

type SessionResponse = { accessToken: string; user: UserDto };

@ApiTags('auth')
@Public()
@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly config: ConfigService,
  ) {}

  @Throttle(authLimit())
  @Post('register')
  async register(
    @Body() dto: RegisterDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<SessionResponse> {
    return this.respond(await this.auth.register(dto), response);
  }

  @Throttle(authLimit())
  @HttpCode(HttpStatus.OK)
  @Post('login')
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<SessionResponse> {
    return this.respond(await this.auth.login(dto), response);
  }

  @HttpCode(HttpStatus.OK)
  @Post('refresh')
  async refresh(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<SessionResponse> {
    try {
      return this.respond(await this.auth.refresh(this.readCookie(request)), response);
    } catch (error) {
      response.clearCookie(REFRESH_COOKIE, this.cookieOptions());
      throw error;
    }
  }

  @HttpCode(HttpStatus.NO_CONTENT)
  @Post('logout')
  async logout(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<void> {
    await this.auth.logout(this.readCookie(request));
    response.clearCookie(REFRESH_COOKIE, this.cookieOptions());
  }

  @Throttle(authLimit())
  @HttpCode(HttpStatus.ACCEPTED)
  @Post('forgot-password')
  async forgotPassword(@Body() dto: ForgotPasswordDto): Promise<{ message: string }> {
    await this.auth.forgotPassword(dto.email);
    return { message: 'Если такой email зарегистрирован, ссылка для восстановления отправлена' };
  }

  @Throttle(authLimit())
  @HttpCode(HttpStatus.NO_CONTENT)
  @Post('reset-password')
  async resetPassword(@Body() dto: ResetPasswordDto): Promise<void> {
    await this.auth.resetPassword(dto);
  }

  private respond(session: Session, response: Response): SessionResponse {
    response.cookie(REFRESH_COOKIE, session.refresh.rawToken, {
      ...this.cookieOptions(),
      expires: session.refresh.expiresAt,
    });
    return { accessToken: session.accessToken, user: session.user };
  }

  private readCookie(request: Request): string | undefined {
    return (request.cookies as Record<string, string | undefined>)[REFRESH_COOKIE];
  }

  private cookieOptions(): CookieOptions {
    return {
      httpOnly: true,
      sameSite: 'lax',
      secure: this.config.get('COOKIE_SECURE') === 'true',
      path: COOKIE_PATH,
    };
  }
}
