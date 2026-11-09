import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { RoleCode } from '@prisma/client';
import { Roles } from '../common/auth/decorators';
import { AuditService } from './audit.service';
import { AuditQueryDto } from './dto/audit.dto';

@ApiTags('audit-logs')
@ApiBearerAuth()
@Roles(RoleCode.MANAGER)
@Controller('audit-logs')
export class AuditController {
  constructor(private readonly audit: AuditService) {}

  @Get()
  list(@Query() query: AuditQueryDto) {
    return this.audit.list(query);
  }
}
