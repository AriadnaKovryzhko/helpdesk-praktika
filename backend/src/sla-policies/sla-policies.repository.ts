import { Injectable } from '@nestjs/common';
import { Prisma, SlaPolicy, TicketPriority } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SlaPoliciesRepository {
  constructor(private readonly prisma: PrismaService) {}

  findAll(): Promise<SlaPolicy[]> {
    return this.prisma.slaPolicy.findMany({ orderBy: { priority: 'asc' } });
  }

  findById(id: number): Promise<SlaPolicy | null> {
    return this.prisma.slaPolicy.findUnique({ where: { id } });
  }

  findByPriority(priority: TicketPriority): Promise<SlaPolicy | null> {
    return this.prisma.slaPolicy.findUnique({ where: { priority } });
  }

  create(data: Prisma.SlaPolicyCreateInput): Promise<SlaPolicy> {
    return this.prisma.slaPolicy.create({ data });
  }

  update(id: number, data: Prisma.SlaPolicyUpdateInput): Promise<SlaPolicy> {
    return this.prisma.slaPolicy.update({ where: { id }, data });
  }

  async delete(id: number): Promise<void> {
    await this.prisma.slaPolicy.delete({ where: { id } });
  }

  countTickets(priority: TicketPriority): Promise<number> {
    return this.prisma.ticket.count({ where: { priority } });
  }
}
