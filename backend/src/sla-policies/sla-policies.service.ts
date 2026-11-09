import { HttpStatus, Injectable } from '@nestjs/common';
import { SlaPolicy } from '@prisma/client';
import { AuditAction } from '../audit/audit.actions';
import { AuditService } from '../audit/audit.service';
import { AuthUser } from '../common/auth/auth-user';
import { AppException } from '../common/errors/app.exception';
import { CreateSlaPolicyDto, UpdateSlaPolicyDto } from './dto/sla-policy.dto';
import { SlaPoliciesRepository } from './sla-policies.repository';

const notFound = () =>
  new AppException(HttpStatus.NOT_FOUND, 'SLA_POLICY_NOT_FOUND', 'SLA-политика не найдена');

@Injectable()
export class SlaPoliciesService {
  constructor(
    private readonly policies: SlaPoliciesRepository,
    private readonly audit: AuditService,
  ) {}

  list(): Promise<SlaPolicy[]> {
    return this.policies.findAll();
  }

  async get(id: number): Promise<SlaPolicy> {
    const policy = await this.policies.findById(id);
    if (!policy) throw notFound();
    return policy;
  }

  async create(dto: CreateSlaPolicyDto, actor: AuthUser): Promise<SlaPolicy> {
    this.assertOrder(dto.reactionMinutes, dto.resolutionMinutes);
    if (await this.policies.findByPriority(dto.priority)) {
      throw new AppException(
        HttpStatus.CONFLICT,
        'SLA_POLICY_EXISTS',
        'Для этого приоритета политика уже существует',
      );
    }
    const policy = await this.policies.create(dto);
    await this.audit.record({
      actorId: actor.id,
      action: AuditAction.SLA_POLICY_CREATED,
      entityType: 'SlaPolicy',
      entityId: policy.id,
      details: { ...dto },
    });
    return policy;
  }

  async update(id: number, dto: UpdateSlaPolicyDto, actor: AuthUser): Promise<SlaPolicy> {
    const policy = await this.get(id);
    this.assertOrder(
      dto.reactionMinutes ?? policy.reactionMinutes,
      dto.resolutionMinutes ?? policy.resolutionMinutes,
    );
    const updated = await this.policies.update(id, dto);
    await this.audit.record({
      actorId: actor.id,
      action: AuditAction.SLA_POLICY_UPDATED,
      entityType: 'SlaPolicy',
      entityId: id,
      details: { ...dto },
    });
    return updated;
  }

  async remove(id: number, actor: AuthUser): Promise<void> {
    const policy = await this.get(id);
    if ((await this.policies.countTickets(policy.priority)) > 0) {
      throw new AppException(
        HttpStatus.CONFLICT,
        'SLA_POLICY_IN_USE',
        'Политика используется в заявках и не может быть удалена',
      );
    }
    await this.policies.delete(id);
    await this.audit.record({
      actorId: actor.id,
      action: AuditAction.SLA_POLICY_DELETED,
      entityType: 'SlaPolicy',
      entityId: id,
      details: { priority: policy.priority },
    });
  }

  private assertOrder(reactionMinutes: number, resolutionMinutes: number): void {
    if (reactionMinutes > resolutionMinutes) {
      throw new AppException(
        HttpStatus.BAD_REQUEST,
        'SLA_INVALID_ORDER',
        'Срок реакции не может быть больше срока решения',
      );
    }
  }
}
