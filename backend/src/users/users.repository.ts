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

  async findPage(
    where: Prisma.UserWhereInput,
    orderBy: Prisma.UserOrderByWithRelationInput,
    skip: number,
    take: number,
  ): Promise<[UserWithRoles[], number]> {
    return this.prisma.$transaction([
      this.prisma.user.findMany({ where, orderBy, skip, take, include: USER_WITH_ROLES }),
      this.prisma.user.count({ where }),
    ]);
  }

  findActiveByRole(role: RoleCode) {
    return this.prisma.user.findMany({
      where: { isBlocked: false, roles: { some: { role: { code: role } } } },
      orderBy: { fullName: 'asc' },
      select: { id: true, fullName: true, email: true },
    });
  }

  updateProfile(id: string, data: { fullName?: string; phone?: string | null }) {
    return this.prisma.user.update({ where: { id }, data, include: USER_WITH_ROLES });
  }

  async updatePassword(id: string, passwordHash: string): Promise<void> {
    await this.prisma.user.update({ where: { id }, data: { passwordHash } });
  }

  async replaceRoles(id: string, codes: RoleCode[]): Promise<UserWithRoles> {
    return this.prisma.$transaction(async (tx) => {
      const roles = await tx.role.findMany({ where: { code: { in: codes } } });
      await tx.userRole.deleteMany({ where: { userId: id } });
      await tx.userRole.createMany({
        data: roles.map((role) => ({ userId: id, roleId: role.id })),
      });
      return tx.user.findUniqueOrThrow({ where: { id }, include: USER_WITH_ROLES });
    });
  }

  // Флаг и отзыв токенов выполняются атомарно: после блокировки не остаётся рабочего refresh-токена.
  async setBlocked(id: string, isBlocked: boolean): Promise<UserWithRoles> {
    return this.prisma.$transaction(async (tx) => {
      if (isBlocked) {
        await tx.refreshToken.updateMany({
          where: { userId: id, revokedAt: null },
          data: { revokedAt: new Date() },
        });
      }
      return tx.user.update({ where: { id }, data: { isBlocked }, include: USER_WITH_ROLES });
    });
  }
}
