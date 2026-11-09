import { RoleCode } from '@prisma/client';
import { AuthUser } from '../common/auth/auth-user';
import { UserWithRoles } from './users.repository';

export interface UserDto {
  id: string;
  email: string;
  fullName: string;
  phone: string | null;
  roles: RoleCode[];
  isBlocked: boolean;
  createdAt: Date;
}

export function roleCodes(user: UserWithRoles): RoleCode[] {
  return user.roles.map(({ role }) => role.code);
}

export function toUserDto(user: UserWithRoles): UserDto {
  return {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    phone: user.phone,
    roles: roleCodes(user),
    isBlocked: user.isBlocked,
    createdAt: user.createdAt,
  };
}

export function toAuthUser(user: UserWithRoles): AuthUser {
  return { id: user.id, email: user.email, fullName: user.fullName, roles: roleCodes(user) };
}
