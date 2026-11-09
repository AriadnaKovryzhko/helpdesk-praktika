import { AuditLogWithActor, AuditRepository } from './audit.repository';
import { AuditAction } from './audit.actions';
import { AuditService } from './audit.service';

describe('AuditService', () => {
  let repo: jest.Mocked<AuditRepository>;
  let service: AuditService;

  beforeEach(() => {
    repo = { create: jest.fn(), findPage: jest.fn() } as unknown as jest.Mocked<AuditRepository>;
    service = new AuditService(repo);
  });

  it('записывает действие с идентификатором объекта строкой', async () => {
    await service.record({
      actorId: 'u',
      action: AuditAction.CATEGORY_CREATED,
      entityType: 'Category',
      entityId: 5,
    });
    expect(repo.create).toHaveBeenCalledWith(
      expect.objectContaining({ actorId: 'u', entityId: '5', action: 'CATEGORY_CREATED' }),
    );
  });

  it('не прерывает основное действие при ошибке записи', async () => {
    repo.create.mockRejectedValue(new Error('сбой'));
    await expect(
      service.record({ actorId: null, action: AuditAction.LOGIN_FAILED, entityType: 'User' }),
    ).resolves.toBeUndefined();
  });

  it('применяет фильтры журнала', async () => {
    repo.findPage.mockResolvedValue([[{ id: '1' } as AuditLogWithActor], 1]);
    await service.list({
      page: 1,
      pageSize: 10,
      sortOrder: 'desc',
      action: 'LOGIN_FAILED',
      entityType: 'User',
      actorId: 'a',
      dateFrom: '2026-01-01',
      dateTo: '2026-02-01',
      search: 'иван',
    });
    const [where, order, skip, take] = repo.findPage.mock.calls[0];
    expect(where.action).toBe('LOGIN_FAILED');
    expect(where.createdAt).toEqual({
      gte: new Date('2026-01-01'),
      lte: new Date('2026-02-01'),
    });
    expect(where.OR).toHaveLength(4);
    expect([order, skip, take]).toEqual(['desc', 0, 10]);
  });
});
