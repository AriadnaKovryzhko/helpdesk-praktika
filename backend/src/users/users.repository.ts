import { Injectable } from '@nestjs/common';
import { Prisma, RoleCode } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export const USER_WITH_ROLES = {
  roles: { include: { role: true } },
} satisfies Prisma.UserInclude;

export type UserWithRoles = Prisma.UserGetPayload<{ include: typeof USER_WITH_ROLES }>;

@Injectable()
export class UsersRepository {
  constructor(private readonly prisma: PrismaService) {}

  findById(id: string): Promise<UserWithRoles | null> {
    return this.prisma.user.findUnique({ where: { id }, include: USER_WITH_ROLES });
  }

  findByEmail(email: string): Promise<UserWithRoles | null> {
    return this.prisma.user.findUnique({ where: { email }, include: USER_WITH_ROLES });
  }

  create(data: {
    email: string;
    passwordHash: string;
    fullName: string;
    role: RoleCode;
  }): Promise<UserWithRoles> {
    return this.prisma.user.create({
      data: {
        email: data.email,
        passwordHash: data.passwordHash,
        fullName: data.fullName,
        roles: { create: { role: { connect: { code: data.role } } } },
      },
      include: USER_WITH_ROLES,
    });
  }
}
