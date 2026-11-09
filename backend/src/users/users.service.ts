import { HttpStatus, Injectable } from '@nestjs/common';
import { Prisma, RoleCode } from '@prisma/client';
import * as argon2 from 'argon2';
import { AuditAction } from '../audit/audit.actions';
import { AuditService } from '../audit/audit.service';
import { AuthUser } from '../common/auth/auth-user';
import { PageResult } from '../common/dto/page-result';
import { AppException } from '../common/errors/app.exception';
import { NotificationsService } from '../notifications/notifications.service';
import { ChangePasswordDto, UpdateProfileDto, UpdateRolesDto, UsersQueryDto } from './dto/user.dto';
import { roleCodes, toUserDto, UserDto } from './user.presenter';
import { UsersRepository, UserWithRoles } from './users.repository';

const notFound = () =>
  new AppException(HttpStatus.NOT_FOUND, 'USER_NOT_FOUND', 'Пользователь не найден');

@Injectable()
export class UsersService {
  constructor(
    private readonly users: UsersRepository,
    private readonly audit: AuditService,
    private readonly notifications: NotificationsService,
  ) {}

  async list(query: UsersQueryDto): Promise<PageResult<UserDto>> {
    const [rows, total] = await this.users.findPage(
      this.buildWhere(query),
      { [query.sortBy]: query.sortOrder },
      (query.page - 1) * query.pageSize,
      query.pageSize,
    );
    return PageResult.of(rows.map(toUserDto), total, query.page, query.pageSize);
  }

  listAgents() {
    return this.users.findActiveByRole(RoleCode.AGENT);
  }

  async get(id: string): Promise<UserDto> {
    return toUserDto(await this.require(id));
  }

  async updateProfile(user: AuthUser, dto: UpdateProfileDto): Promise<UserDto> {
    const phone = dto.phone === '' ? null : dto.phone;
    return toUserDto(await this.users.updateProfile(user.id, { fullName: dto.fullName, phone }));
  }

  async changePassword(user: AuthUser, dto: ChangePasswordDto): Promise<void> {
    const current = await this.require(user.id);
    if (!(await argon2.verify(current.passwordHash, dto.currentPassword))) {
      throw new AppException(
        HttpStatus.BAD_REQUEST,
        'INVALID_CURRENT_PASSWORD',
        'Текущий пароль указан неверно',
      );
    }
    await this.users.updatePassword(user.id, await argon2.hash(dto.newPassword));
    await this.audit.record({
      actorId: user.id,
      action: AuditAction.PASSWORD_CHANGED,
      entityType: 'User',
      entityId: user.id,
    });
  }

  async updateRoles(id: string, dto: UpdateRolesDto, actor: AuthUser): Promise<UserDto> {
    const before = await this.require(id);
    if (id === actor.id && !dto.roles.includes(RoleCode.MANAGER)) {
      throw new AppException(
        HttpStatus.CONFLICT,
        'CANNOT_DEMOTE_SELF',
        'Нельзя снять роль руководителя с самого себя',
      );
    }
    const updated = await this.users.replaceRoles(id, dto.roles);
    await this.audit.record({
      actorId: actor.id,
      action: AuditAction.USER_ROLES_CHANGED,
      entityType: 'User',
      entityId: id,
      details: { from: roleCodes(before), to: dto.roles },
    });
    return toUserDto(updated);
  }

  async block(id: string, actor: AuthUser): Promise<UserDto> {
    if (id === actor.id) {
      throw new AppException(HttpStatus.CONFLICT, 'CANNOT_BLOCK_SELF', 'Нельзя заблокировать себя');
    }
    await this.require(id);
    const updated = await this.users.setBlocked(id, true);
    this.notifications.disconnectUser(id);
    await this.audit.record({
      actorId: actor.id,
      action: AuditAction.USER_BLOCKED,
      entityType: 'User',
      entityId: id,
    });
    return toUserDto(updated);
  }

  async unblock(id: string, actor: AuthUser): Promise<UserDto> {
    await this.require(id);
    const updated = await this.users.setBlocked(id, false);
    await this.audit.record({
      actorId: actor.id,
      action: AuditAction.USER_UNBLOCKED,
      entityType: 'User',
      entityId: id,
    });
    return toUserDto(updated);
  }

  private async require(id: string): Promise<UserWithRoles> {
    const user = await this.users.findById(id);
    if (!user) throw notFound();
    return user;
  }

  private buildWhere(query: UsersQueryDto): Prisma.UserWhereInput {
    const search = query.search?.trim();
    return {
      ...(query.role ? { roles: { some: { role: { code: query.role } } } } : {}),
      ...(query.isBlocked !== undefined ? { isBlocked: query.isBlocked } : {}),
      ...(search
        ? {
            OR: [
              { fullName: { contains: search, mode: 'insensitive' as const } },
              { email: { contains: search, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    };
  }
}
