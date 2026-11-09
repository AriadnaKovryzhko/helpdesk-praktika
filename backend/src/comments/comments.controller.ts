import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthUser } from '../common/auth/auth-user';
import { CurrentUser } from '../common/auth/decorators';
import { CommentsService } from './comments.service';
import { CommentDto } from './dto/comment.dto';

@ApiTags('comments')
@ApiBearerAuth()
@Controller('tickets/:ticketId/comments')
export class CommentsController {
  constructor(private readonly comments: CommentsService) {}

  @Get()
  list(@Param('ticketId', ParseUUIDPipe) ticketId: string, @CurrentUser() user: AuthUser) {
    return this.comments.list(ticketId, user);
  }

  @Post()
  create(
    @Param('ticketId', ParseUUIDPipe) ticketId: string,
    @Body() dto: CommentDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.comments.create(ticketId, dto.body, user);
  }

  @Patch(':commentId')
  update(
    @Param('ticketId', ParseUUIDPipe) ticketId: string,
    @Param('commentId', ParseUUIDPipe) commentId: string,
    @Body() dto: CommentDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.comments.update(ticketId, commentId, dto.body, user);
  }

  @Delete(':commentId')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @Param('ticketId', ParseUUIDPipe) ticketId: string,
    @Param('commentId', ParseUUIDPipe) commentId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.comments.remove(ticketId, commentId, user);
  }
}
