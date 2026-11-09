import { RoleCode } from '@prisma/client';

export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  roles: RoleCode[];
}

export const hasRole = (user: AuthUser, role: RoleCode): boolean => user.roles.includes(role);
