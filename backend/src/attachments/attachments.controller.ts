import {
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  StreamableFile,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { AuthUser } from '../common/auth/auth-user';
import { CurrentUser } from '../common/auth/decorators';
import {
  AttachmentsService,
  MAX_ATTACHMENT_BYTES,
  UploadedAttachment,
} from './attachments.service';

@ApiTags('attachments')
@ApiBearerAuth()
@Controller('tickets/:ticketId/attachments')
export class AttachmentsController {
  constructor(private readonly attachments: AttachmentsService) {}

  @Get()
  list(@Param('ticketId', ParseUUIDPipe) ticketId: string, @CurrentUser() user: AuthUser) {
    return this.attachments.list(ticketId, user);
  }

  @Post()
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: MAX_ATTACHMENT_BYTES, files: 1 } }),
  )
  upload(
    @Param('ticketId', ParseUUIDPipe) ticketId: string,
    @UploadedFile() file: UploadedAttachment | undefined,
    @CurrentUser() user: AuthUser,
  ) {
    return this.attachments.upload(ticketId, file, user);
  }

  @Get(':attachmentId/download')
  async download(
    @Param('ticketId', ParseUUIDPipe) ticketId: string,
    @Param('attachmentId', ParseUUIDPipe) attachmentId: string,
    @CurrentUser() user: AuthUser,
  ): Promise<StreamableFile> {
    const file = await this.attachments.download(ticketId, attachmentId, user);
    return new StreamableFile(file.stream, {
      type: file.mimeType,
      length: file.sizeBytes,
      disposition: `attachment; filename*=UTF-8''${encodeURIComponent(file.originalName)}`,
    });
  }

  @Delete(':attachmentId')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @Param('ticketId', ParseUUIDPipe) ticketId: string,
    @Param('attachmentId', ParseUUIDPipe) attachmentId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.attachments.remove(ticketId, attachmentId, user);
  }
}
