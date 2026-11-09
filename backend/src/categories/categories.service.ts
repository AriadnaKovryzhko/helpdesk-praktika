import { HttpStatus, Injectable } from '@nestjs/common';
import { Category, RoleCode } from '@prisma/client';
import { AuthUser, hasRole } from '../common/auth/auth-user';
import { AppException } from '../common/errors/app.exception';
import { CategoriesRepository } from './categories.repository';
import { CreateCategoryDto, UpdateCategoryDto } from './dto/category.dto';

const notFound = () =>
  new AppException(HttpStatus.NOT_FOUND, 'CATEGORY_NOT_FOUND', 'Категория не найдена');

@Injectable()
export class CategoriesService {
  constructor(private readonly categories: CategoriesRepository) {}

  list(includeInactive: boolean | undefined, user: AuthUser): Promise<Category[]> {
    return this.categories.findAll(Boolean(includeInactive) && hasRole(user, RoleCode.MANAGER));
  }

  async get(id: number): Promise<Category> {
    const category = await this.categories.findById(id);
    if (!category) throw notFound();
    return category;
  }

  async create(dto: CreateCategoryDto): Promise<Category> {
    await this.assertNameFree(dto.name);
    return this.categories.create(dto);
  }

  async update(id: number, dto: UpdateCategoryDto): Promise<Category> {
    const category = await this.get(id);
    if (dto.name && dto.name !== category.name) await this.assertNameFree(dto.name);
    return this.categories.update(id, dto);
  }

  async remove(id: number): Promise<void> {
    await this.get(id);
    if ((await this.categories.countTickets(id)) > 0) {
      throw new AppException(
        HttpStatus.CONFLICT,
        'CATEGORY_IN_USE',
        'В категории есть заявки. Её можно только отключить',
      );
    }
    await this.categories.delete(id);
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
