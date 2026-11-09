import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

const ATTACHMENT_INCLUDE = {
  uploader: { select: { id: true, fullName: true, email: true } },
} satisfies Prisma.TicketAttachmentInclude;

export type AttachmentWithUploader = Prisma.TicketAttachmentGetPayload<{
  include: typeof ATTACHMENT_INCLUDE;
}>;

@Injectable()
export class AttachmentsRepository {
  constructor(private readonly prisma: PrismaService) {}

  findByTicket(ticketId: string): Promise<AttachmentWithUploader[]> {
    return this.prisma.ticketAttachment.findMany({
      where: { ticketId },
      orderBy: { createdAt: 'asc' },
      include: ATTACHMENT_INCLUDE,
    });
  }

  findInTicket(ticketId: string, id: string): Promise<AttachmentWithUploader | null> {
    return this.prisma.ticketAttachment.findFirst({
      where: { id, ticketId },
      include: ATTACHMENT_INCLUDE,
    });
  }

  countByTicket(ticketId: string): Promise<number> {
    return this.prisma.ticketAttachment.count({ where: { ticketId } });
  }

  create(data: Prisma.TicketAttachmentUncheckedCreateInput): Promise<AttachmentWithUploader> {
    return this.prisma.ticketAttachment.create({ data, include: ATTACHMENT_INCLUDE });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.ticketAttachment.delete({ where: { id } });
  }
}
