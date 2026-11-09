import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

const COMMENT_INCLUDE = {
  author: { select: { id: true, fullName: true, email: true } },
} satisfies Prisma.TicketCommentInclude;

export type CommentWithAuthor = Prisma.TicketCommentGetPayload<{
  include: typeof COMMENT_INCLUDE;
}>;

@Injectable()
export class CommentsRepository {
  constructor(private readonly prisma: PrismaService) {}

  findByTicket(ticketId: string): Promise<CommentWithAuthor[]> {
    return this.prisma.ticketComment.findMany({
      where: { ticketId },
      orderBy: { createdAt: 'asc' },
      include: COMMENT_INCLUDE,
    });
  }

  findInTicket(ticketId: string, id: string): Promise<CommentWithAuthor | null> {
    return this.prisma.ticketComment.findFirst({
      where: { id, ticketId },
      include: COMMENT_INCLUDE,
    });
  }

  create(ticketId: string, authorId: string, body: string): Promise<CommentWithAuthor> {
    return this.prisma.ticketComment.create({
      data: { ticketId, authorId, body },
      include: COMMENT_INCLUDE,
    });
  }

  update(id: string, body: string): Promise<CommentWithAuthor> {
    return this.prisma.ticketComment.update({
      where: { id },
      data: { body },
      include: COMMENT_INCLUDE,
    });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.ticketComment.delete({ where: { id } });
  }
}
