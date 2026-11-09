import { RoleCode, TicketPriority } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { AuthUser } from '../common/auth/auth-user';
import { AppException } from '../common/errors/app.exception';
import { SlaPoliciesRepository } from './sla-policies.repository';
import { SlaPoliciesService } from './sla-policies.service';

const manager: AuthUser = { id: 'm', email: 'm@t.ru', fullName: 'm', roles: [RoleCode.MANAGER] };
const row = { id: 1, priority: TicketPriority.LOW, reactionMinutes: 10, resolutionMinutes: 100 };

describe('SlaPoliciesService', () => {
  let repo: jest.Mocked<SlaPoliciesRepository>;
  let service: SlaPoliciesService;

  beforeEach(() => {
    repo = {
      findAll: jest.fn(),
      findById: jest.fn().mockResolvedValue(row),
      findByPriority: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue(row),
      update: jest.fn().mockResolvedValue(row),
      delete: jest.fn(),
      countTickets: jest.fn().mockResolvedValue(0),
    } as unknown as jest.Mocked<SlaPoliciesRepository>;
    service = new SlaPoliciesService(repo, { record: jest.fn() } as unknown as AuditService);
  });

  const dto = { priority: TicketPriority.LOW, reactionMinutes: 10, resolutionMinutes: 100 };

  it('создаёт политику', async () => {
    expect(await service.create(dto, manager)).toBe(row);
  });

  it('не допускает реакцию дольше решения', async () => {
    await expect(service.create({ ...dto, reactionMinutes: 200 }, manager)).rejects.toBeInstanceOf(
      AppException,
    );
  });

  it('проверяет порядок сроков с учётом текущих значений', async () => {
    await expect(service.update(1, { reactionMinutes: 500 }, manager)).rejects.toBeInstanceOf(
      AppException,
    );
    await service.update(1, { resolutionMinutes: 50 }, manager);
    expect(repo.update).toHaveBeenCalledWith(1, { resolutionMinutes: 50 });
  });

  it('не создаёт вторую политику для приоритета', async () => {
    repo.findByPriority.mockResolvedValue(row);
    await expect(service.create(dto, manager)).rejects.toBeInstanceOf(AppException);
  });

  it('не удаляет используемую политику', async () => {
    repo.countTickets.mockResolvedValue(1);
    await expect(service.remove(1, manager)).rejects.toBeInstanceOf(AppException);
  });

  it('удаляет неиспользуемую политику', async () => {
    await service.remove(1, manager);
    expect(repo.delete).toHaveBeenCalledWith(1);
  });

  it('сообщает об отсутствии политики', async () => {
    repo.findById.mockResolvedValue(null);
    await expect(service.get(9)).rejects.toBeInstanceOf(AppException);
  });
});
