import { HttpStatus, Injectable } from '@nestjs/common';
import { RoleCode, TicketStatus } from '@prisma/client';
import { ReadStream } from 'fs';
import { basename } from 'path';
import { AuditAction } from '../audit/audit.actions';
import { AuditService } from '../audit/audit.service';
import { AuthUser, hasRole } from '../common/auth/auth-user';
import { AppException } from '../common/errors/app.exception';
import { TicketsService } from '../tickets/tickets.service';
import { AttachmentStorageService } from './attachment-storage.service';
import { AttachmentsRepository, AttachmentWithUploader } from './attachments.repository';
import { detectAllowedFile } from './file-signature';

export const MAX_ATTACHMENT_BYTES = 5 * 1024 * 1024;
const MAX_ATTACHMENTS_PER_TICKET = 20;
const MAX_NAME_LENGTH = 255;

export interface UploadedAttachment {
  originalname: string;
  buffer: Buffer;
  size: number;
}

export interface AttachmentDownload {
  stream: ReadStream;
  mimeType: string;
  originalName: string;
  sizeBytes: number;
}

// Multer читает заголовок имени файла в latin1, а браузеры присылают UTF-8.
export function cleanFileName(rawName: string): string {
  const decoded = Buffer.from(rawName, 'latin1').toString('utf8');
  const name = [...basename(decoded.replace(/\\/g, '/'))]
    .filter((char) => char.charCodeAt(0) > 31 && char.charCodeAt(0) !== 127 && char !== '"')
    .join('');
  return name.slice(-MAX_NAME_LENGTH) || 'file';
}

const notFound = () =>
  new AppException(HttpStatus.NOT_FOUND, 'ATTACHMENT_NOT_FOUND', 'Вложение не найдено');

@Injectable()
export class AttachmentsService {
  constructor(
    private readonly attachments: AttachmentsRepository,
    private readonly storage: AttachmentStorageService,
    private readonly tickets: TicketsService,
    private readonly audit: AuditService,
  ) {}

  async list(ticketId: string, user: AuthUser) {
    await this.tickets.getAccessible(ticketId, user);
    const rows = await this.attachments.findByTicket(ticketId);
    return rows.map((row) => this.present(row, user));
  }

  async upload(ticketId: string, file: UploadedAttachment | undefined, user: AuthUser) {
    const ticket = await this.tickets.getAccessible(ticketId, user);
    if (ticket.status === TicketStatus.CLOSED) {
      throw new AppException(
        HttpStatus.CONFLICT,
        'TICKET_CLOSED',
        'Заявка закрыта, добавить вложение нельзя',
      );
    }
    if (!file) {
      throw new AppException(HttpStatus.BAD_REQUEST, 'FILE_REQUIRED', 'Выберите файл');
    }
    if (file.size > MAX_ATTACHMENT_BYTES) {
      throw new AppException(
        HttpStatus.PAYLOAD_TOO_LARGE,
        'FILE_TOO_LARGE',
        'Размер файла превышает допустимые 5 МБ',
      );
    }
    const detected = detectAllowedFile(file.buffer);
    if (!detected) {
      throw new AppException(
        HttpStatus.BAD_REQUEST,
        'UNSUPPORTED_FILE_TYPE',
        'Разрешены только файлы jpg, png, pdf и docx',
      );
    }
    if ((await this.attachments.countByTicket(ticketId)) >= MAX_ATTACHMENTS_PER_TICKET) {
      throw new AppException(
        HttpStatus.CONFLICT,
        'TOO_MANY_ATTACHMENTS',
        `К заявке можно прикрепить не больше ${MAX_ATTACHMENTS_PER_TICKET} файлов`,
      );
    }
    const storedName = await this.storage.save(file.buffer, detected.extension);
    try {
      const attachment = await this.attachments.create({
        ticketId,
        uploaderId: user.id,
        originalName: cleanFileName(file.originalname),
        storedName,
        mimeType: detected.mimeType,
        sizeBytes: file.size,
      });
      await this.audit.record({
        actorId: user.id,
        action: AuditAction.ATTACHMENT_ADDED,
        entityType: 'TicketAttachment',
        entityId: attachment.id,
        details: { ticketId, name: attachment.originalName },
      });
      return this.present(attachment, user);
    } catch (error) {
      await this.storage.remove(storedName);
      throw error;
    }
  }

  async download(
    ticketId: string,
    attachmentId: string,
    user: AuthUser,
  ): Promise<AttachmentDownload> {
    const attachment = await this.getInTicket(ticketId, attachmentId, user);
    return {
      stream: this.storage.open(attachment.storedName),
      mimeType: attachment.mimeType,
      originalName: attachment.originalName,
      sizeBytes: attachment.sizeBytes,
    };
  }

  async remove(ticketId: string, attachmentId: string, user: AuthUser): Promise<void> {
    const attachment = await this.getInTicket(ticketId, attachmentId, user);
    if (!this.canDelete(attachment, user)) {
      throw new AppException(
        HttpStatus.FORBIDDEN,
        'FORBIDDEN',
        'Удалить вложение может загрузивший его участник или руководитель',
      );
    }
    await this.attachments.delete(attachmentId);
    await this.storage.remove(attachment.storedName);
    await this.audit.record({
      actorId: user.id,
      action: AuditAction.ATTACHMENT_DELETED,
      entityType: 'TicketAttachment',
      entityId: attachmentId,
      details: { ticketId, name: attachment.originalName },
    });
  }

  private async getInTicket(ticketId: string, attachmentId: string, user: AuthUser) {
    await this.tickets.getAccessible(ticketId, user);
    const attachment = await this.attachments.findInTicket(ticketId, attachmentId);
    if (!attachment) throw notFound();
    return attachment;
  }

  private canDelete(attachment: AttachmentWithUploader, user: AuthUser): boolean {
    return attachment.uploaderId === user.id || hasRole(user, RoleCode.MANAGER);
  }

  private present(attachment: AttachmentWithUploader, user: AuthUser) {
    return {
      id: attachment.id,
      originalName: attachment.originalName,
      mimeType: attachment.mimeType,
      sizeBytes: attachment.sizeBytes,
      uploader: attachment.uploader,
      canDelete: this.canDelete(attachment, user),
      createdAt: attachment.createdAt,
    };
  }
}
