import { Injectable } from '@nestjs/common';
import { Category, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CategoriesRepository {
  constructor(private readonly prisma: PrismaService) {}

  findAll(includeInactive: boolean): Promise<Category[]> {
    return this.prisma.category.findMany({
      where: includeInactive ? {} : { isActive: true },
      orderBy: { name: 'asc' },
    });
  }

  findById(id: number): Promise<Category | null> {
    return this.prisma.category.findUnique({ where: { id } });
  }

  findByName(name: string): Promise<Category | null> {
    return this.prisma.category.findUnique({ where: { name } });
  }

  create(data: Prisma.CategoryCreateInput): Promise<Category> {
    return this.prisma.category.create({ data });
  }

  update(id: number, data: Prisma.CategoryUpdateInput): Promise<Category> {
    return this.prisma.category.update({ where: { id }, data });
  }

  async delete(id: number): Promise<void> {
    await this.prisma.category.delete({ where: { id } });
  }

  countTickets(id: number): Promise<number> {
    return this.prisma.ticket.count({ where: { categoryId: id } });
  }
}
