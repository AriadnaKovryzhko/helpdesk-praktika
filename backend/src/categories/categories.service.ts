import { HttpStatus, Injectable } from '@nestjs/common';
import { Category, RoleCode } from '@prisma/client';
import { AuditAction } from '../audit/audit.actions';
import { AuditService } from '../audit/audit.service';
import { AuthUser, hasRole } from '../common/auth/auth-user';
import { AppException } from '../common/errors/app.exception';
import { CategoriesRepository } from './categories.repository';
import { CreateCategoryDto, UpdateCategoryDto } from './dto/category.dto';

const notFound = () =>
  new AppException(HttpStatus.NOT_FOUND, 'CATEGORY_NOT_FOUND', 'Категория не найдена');

@Injectable()
export class CategoriesService {
  constructor(
    private readonly categories: CategoriesRepository,
    private readonly audit: AuditService,
  ) {}

  list(includeInactive: boolean | undefined, user: AuthUser): Promise<Category[]> {
    return this.categories.findAll(Boolean(includeInactive) && hasRole(user, RoleCode.MANAGER));
  }

  async get(id: number): Promise<Category> {
    const category = await this.categories.findById(id);
    if (!category) throw notFound();
    return category;
  }

  async create(dto: CreateCategoryDto, actor: AuthUser): Promise<Category> {
    await this.assertNameFree(dto.name);
    const category = await this.categories.create(dto);
    await this.audit.record({
      actorId: actor.id,
      action: AuditAction.CATEGORY_CREATED,
      entityType: 'Category',
      entityId: category.id,
      details: { name: category.name },
    });
    return category;
  }

  async update(id: number, dto: UpdateCategoryDto, actor: AuthUser): Promise<Category> {
    const category = await this.get(id);
    if (dto.name && dto.name !== category.name) await this.assertNameFree(dto.name);
    const updated = await this.categories.update(id, dto);
    await this.audit.record({
      actorId: actor.id,
      action: AuditAction.CATEGORY_UPDATED,
      entityType: 'Category',
      entityId: id,
      details: { fields: Object.keys(dto) },
    });
    return updated;
  }

  async remove(id: number, actor: AuthUser): Promise<void> {
    const category = await this.get(id);
    if ((await this.categories.countTickets(id)) > 0) {
      throw new AppException(
        HttpStatus.CONFLICT,
        'CATEGORY_IN_USE',
        'В категории есть заявки. Её можно только отключить',
      );
    }
    await this.categories.delete(id);
    await this.audit.record({
      actorId: actor.id,
      action: AuditAction.CATEGORY_DELETED,
      entityType: 'Category',
      entityId: id,
      details: { name: category.name },
    });
  }

  private async assertNameFree(name: string): Promise<void> {
    if (await this.categories.findByName(name)) {
      throw new AppException(
        HttpStatus.CONFLICT,
        'CATEGORY_EXISTS',
        'Категория с таким названием уже существует',
      );
    }
  }
}
