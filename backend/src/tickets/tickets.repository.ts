import { Injectable } from '@nestjs/common';
import { Prisma, TicketStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

const BRIEF_USER = { select: { id: true, fullName: true, email: true } };

export const TICKET_INCLUDE = {
  category: { select: { id: true, name: true } },
  author: BRIEF_USER,
  assignee: BRIEF_USER,
} satisfies Prisma.TicketInclude;

export type TicketWithRelations = Prisma.TicketGetPayload<{ include: typeof TICKET_INCLUDE }>;

export interface StatusChange {
  ticketId: string;
  fromStatus: TicketStatus;
  toStatus: TicketStatus;
  changedById: string;
  comment?: string;
  data: Prisma.TicketUncheckedUpdateManyInput;
}

export interface Assignment {
  ticketId: string;
  fromStatus: TicketStatus;
  currentAssigneeId: string | null;
  assigneeId: string;
  changedById: string;
  reactedAt: Date;
}

@Injectable()
export class TicketsRepository {
  constructor(private readonly prisma: PrismaService) {}

  findById(id: string): Promise<TicketWithRelations | null> {
    return this.prisma.ticket.findUnique({ where: { id }, include: TICKET_INCLUDE });
  }

  async findPage(
    where: Prisma.TicketWhereInput,
    orderBy: Prisma.TicketOrderByWithRelationInput,
    skip: number,
    take: number,
  ): Promise<[TicketWithRelations[], number]> {
    return this.prisma.$transaction([
      this.prisma.ticket.findMany({ where, orderBy, skip, take, include: TICKET_INCLUDE }),
      this.prisma.ticket.count({ where }),
    ]);
  }

  create(data: Prisma.TicketUncheckedCreateInput): Promise<TicketWithRelations> {
    return this.prisma.ticket.create({
      data: {
        ...data,
        statusHistory: { create: { toStatus: TicketStatus.NEW, changedById: data.authorId } },
      },
      include: TICKET_INCLUDE,
    });
  }

  update(id: string, data: Prisma.TicketUncheckedUpdateInput): Promise<TicketWithRelations> {
    return this.prisma.ticket.update({ where: { id }, data, include: TICKET_INCLUDE });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.ticket.delete({ where: { id } });
  }

  // Условие по текущему статусу защищает от одновременной смены статуса двумя участниками.
  applyStatusChange(change: StatusChange): Promise<TicketWithRelations | null> {
    return this.prisma.$transaction(async (tx) => {
      const { count } = await tx.ticket.updateMany({
        where: { id: change.ticketId, status: change.fromStatus },
        data: { ...change.data, status: change.toStatus },
      });
      if (count !== 1) return null;
      await tx.ticketStatusHistory.create({
        data: {
          ticketId: change.ticketId,
          fromStatus: change.fromStatus,
          toStatus: change.toStatus,
          changedById: change.changedById,
          comment: change.comment,
        },
      });
      return tx.ticket.findUniqueOrThrow({
        where: { id: change.ticketId },
        include: TICKET_INCLUDE,
      });
    });
  }

  // Заявку может получить только один исполнитель: второй запрос не найдёт строку с прежним значением.
  applyAssignment(assignment: Assignment): Promise<TicketWithRelations | null> {
    const movesToAssigned = assignment.fromStatus === TicketStatus.NEW;
    return this.prisma.$transaction(async (tx) => {
      const { count } = await tx.ticket.updateMany({
        where: {
          id: assignment.ticketId,
          status: assignment.fromStatus,
          assigneeId: assignment.currentAssigneeId,
        },
        data: {
          assigneeId: assignment.assigneeId,
          ...(movesToAssigned
            ? { status: TicketStatus.ASSIGNED, reactedAt: assignment.reactedAt }
            : {}),
        },
      });
      if (count !== 1) return null;
      if (movesToAssigned) {
        await tx.ticketStatusHistory.create({
          data: {
            ticketId: assignment.ticketId,
            fromStatus: TicketStatus.NEW,
            toStatus: TicketStatus.ASSIGNED,
            changedById: assignment.changedById,
          },
        });
      }
      return tx.ticket.findUniqueOrThrow({
        where: { id: assignment.ticketId },
        include: TICKET_INCLUDE,
      });
    });
  }

  findHistory(ticketId: string) {
    return this.prisma.ticketStatusHistory.findMany({
      where: { ticketId },
      orderBy: { createdAt: 'asc' },
      include: { changedBy: BRIEF_USER },
    });
  }

  findReactionBreaches(now: Date): Promise<TicketWithRelations[]> {
    return this.prisma.ticket.findMany({
      where: { status: TicketStatus.NEW, reactionBreachedAt: null, reactionDueAt: { lt: now } },
      include: TICKET_INCLUDE,
    });
  }

  findResolutionBreaches(now: Date, openStatuses: TicketStatus[]): Promise<TicketWithRelations[]> {
    return this.prisma.ticket.findMany({
      where: {
        status: { in: openStatuses },
        resolutionBreachedAt: null,
        resolutionDueAt: { lt: now },
      },
      include: TICKET_INCLUDE,
    });
  }

  async markReactionBreached(id: string, at: Date): Promise<boolean> {
    const { count } = await this.prisma.ticket.updateMany({
      where: { id, reactionBreachedAt: null },
      data: { reactionBreachedAt: at },
    });
    return count === 1;
  }

  async markResolutionBreached(id: string, at: Date): Promise<boolean> {
    const { count } = await this.prisma.ticket.updateMany({
      where: { id, resolutionBreachedAt: null },
      data: { resolutionBreachedAt: at },
    });
    return count === 1;
  }
}
