import { Module } from '@nestjs/common';
import { TicketsModule } from '../tickets/tickets.module';
import { AttachmentStorageService } from './attachment-storage.service';
import { AttachmentsController } from './attachments.controller';
import { AttachmentsRepository } from './attachments.repository';
import { AttachmentsService } from './attachments.service';

@Module({
  imports: [TicketsModule],
  controllers: [AttachmentsController],
  providers: [AttachmentsService, AttachmentsRepository, AttachmentStorageService],
})
export class AttachmentsModule {}
