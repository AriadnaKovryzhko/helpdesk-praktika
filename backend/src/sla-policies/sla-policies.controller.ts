import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { RoleCode } from '@prisma/client';
import { Roles } from '../common/auth/decorators';
import { CreateSlaPolicyDto, UpdateSlaPolicyDto } from './dto/sla-policy.dto';
import { SlaPoliciesService } from './sla-policies.service';

@ApiTags('sla-policies')
@ApiBearerAuth()
@Controller('sla-policies')
export class SlaPoliciesController {
  constructor(private readonly policies: SlaPoliciesService) {}

  @Get()
  list() {
    return this.policies.list();
  }

  @Get(':id')
  get(@Param('id', ParseIntPipe) id: number) {
    return this.policies.get(id);
  }

  @Roles(RoleCode.MANAGER)
  @Post()
  create(@Body() dto: CreateSlaPolicyDto) {
    return this.policies.create(dto);
  }

  @Roles(RoleCode.MANAGER)
  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateSlaPolicyDto) {
    return this.policies.update(id, dto);
  }

  @Roles(RoleCode.MANAGER)
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.policies.remove(id);
  }
}
