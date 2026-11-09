import { RoleCode } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { AuthUser } from '../common/auth/auth-user';
import { AppException } from '../common/errors/app.exception';
import { CategoriesRepository } from './categories.repository';
import { CategoriesService } from './categories.service';

const manager: AuthUser = { id: 'm', email: 'm@t.ru', fullName: 'm', roles: [RoleCode.MANAGER] };
const plain: AuthUser = { ...manager, roles: [RoleCode.USER] };
const row = { id: 1, name: 'Сеть', description: null, isActive: true };

describe('CategoriesService', () => {
  let repo: jest.Mocked<CategoriesRepository>;
  let service: CategoriesService;

  beforeEach(() => {
    repo = {
      findAll: jest.fn(),
      findById: jest.fn().mockResolvedValue(row),
      findByName: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue(row),
      update: jest.fn().mockResolvedValue(row),
      delete: jest.fn(),
      countTickets: jest.fn().mockResolvedValue(0),
    } as unknown as jest.Mocked<CategoriesRepository>;
    service = new CategoriesService(repo, { record: jest.fn() } as unknown as AuditService);
  });

  it('показывает отключённые категории только руководителю', async () => {
    await service.list(true, plain);
    expect(repo.findAll).toHaveBeenLastCalledWith(false);
    await service.list(true, manager);
    expect(repo.findAll).toHaveBeenLastCalledWith(true);
  });

  it('создаёт категорию', async () => {
    expect(await service.create({ name: 'Сеть' }, manager)).toBe(row);
  });

  it('отклоняет занятое название', async () => {
    repo.findByName.mockResolvedValue(row);
    await expect(service.create({ name: 'Сеть' }, manager)).rejects.toBeInstanceOf(AppException);
  });

  it('обновляет категорию', async () => {
    await service.update(1, { name: 'Другая' }, manager);
    expect(repo.update).toHaveBeenCalledWith(1, { name: 'Другая' });
  });

  it('не удаляет категорию с заявками', async () => {
    repo.countTickets.mockResolvedValue(2);
    await expect(service.remove(1, manager)).rejects.toBeInstanceOf(AppException);
    expect(repo.delete).not.toHaveBeenCalled();
  });

  it('удаляет пустую категорию', async () => {
    await service.remove(1, manager);
    expect(repo.delete).toHaveBeenCalledWith(1);
  });

  it('сообщает об отсутствии категории', async () => {
    repo.findById.mockResolvedValue(null);
    await expect(service.get(9)).rejects.toBeInstanceOf(AppException);
  });
});
