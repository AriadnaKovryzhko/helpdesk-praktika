import { HttpStatus, Injectable } from '@nestjs/common';
import { SlaPolicy } from '@prisma/client';
import { AppException } from '../common/errors/app.exception';
import { CreateSlaPolicyDto, UpdateSlaPolicyDto } from './dto/sla-policy.dto';
import { SlaPoliciesRepository } from './sla-policies.repository';

const notFound = () =>
  new AppException(HttpStatus.NOT_FOUND, 'SLA_POLICY_NOT_FOUND', 'SLA-политика не найдена');

@Injectable()
export class SlaPoliciesService {
  constructor(private readonly policies: SlaPoliciesRepository) {}

  list(): Promise<SlaPolicy[]> {
    return this.policies.findAll();
  }

  async get(id: number): Promise<SlaPolicy> {
    const policy = await this.policies.findById(id);
    if (!policy) throw notFound();
    return policy;
  }

  async create(dto: CreateSlaPolicyDto): Promise<SlaPolicy> {
    this.assertOrder(dto.reactionMinutes, dto.resolutionMinutes);
    if (await this.policies.findByPriority(dto.priority)) {
      throw new AppException(
        HttpStatus.CONFLICT,
        'SLA_POLICY_EXISTS',
        'Для этого приоритета политика уже существует',
      );
    }
    return this.policies.create(dto);
  }

  async update(id: number, dto: UpdateSlaPolicyDto): Promise<SlaPolicy> {
    const policy = await this.get(id);
    this.assertOrder(
      dto.reactionMinutes ?? policy.reactionMinutes,
      dto.resolutionMinutes ?? policy.resolutionMinutes,
    );
    return this.policies.update(id, dto);
  }

  async remove(id: number): Promise<void> {
    const policy = await this.get(id);
    if ((await this.policies.countTickets(policy.priority)) > 0) {
      throw new AppException(
        HttpStatus.CONFLICT,
        'SLA_POLICY_IN_USE',
        'Политика используется в заявках и не может быть удалена',
      );
    }
    await this.policies.delete(id);
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
