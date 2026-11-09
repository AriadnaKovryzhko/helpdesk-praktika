import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { RoleCode } from '@prisma/client';
import { AuthUser } from '../common/auth/auth-user';
import { CurrentUser, Roles } from '../common/auth/decorators';
import { ChangePasswordDto, UpdateProfileDto, UpdateRolesDto, UsersQueryDto } from './dto/user.dto';
import { UsersService } from './users.service';

@ApiTags('users')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Roles(RoleCode.MANAGER)
  @Get()
  list(@Query() query: UsersQueryDto) {
    return this.users.list(query);
  }

  @Roles(RoleCode.AGENT, RoleCode.MANAGER)
  @Get('agents')
  agents() {
    return this.users.listAgents();
  }

  @Get('me')
  me(@CurrentUser() user: AuthUser) {
    return this.users.get(user.id);
  }

  @Patch('me')
  updateMe(@CurrentUser() user: AuthUser, @Body() dto: UpdateProfileDto) {
    return this.users.updateProfile(user, dto);
  }

  @Post('me/password')
  @HttpCode(HttpStatus.NO_CONTENT)
  changePassword(@CurrentUser() user: AuthUser, @Body() dto: ChangePasswordDto) {
    return this.users.changePassword(user, dto);
  }

  @Roles(RoleCode.MANAGER)
  @Get(':id')
  get(@Param('id', ParseUUIDPipe) id: string) {
    return this.users.get(id);
  }

  @Roles(RoleCode.MANAGER)
  @Put(':id/roles')
  updateRoles(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateRolesDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.users.updateRoles(id, dto, actor);
  }

  @Roles(RoleCode.MANAGER)
  @Post(':id/block')
  @HttpCode(HttpStatus.OK)
  block(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() actor: AuthUser) {
    return this.users.block(id, actor);
  }

  @Roles(RoleCode.MANAGER)
  @Post(':id/unblock')
  @HttpCode(HttpStatus.OK)
  unblock(@Param('id', ParseUUIDPipe) id: string) {
    return this.users.unblock(id);
  }
}
