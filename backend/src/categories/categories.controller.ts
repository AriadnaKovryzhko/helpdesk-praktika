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
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { RoleCode } from '@prisma/client';
import { AuthUser } from '../common/auth/auth-user';
import { CurrentUser, Roles } from '../common/auth/decorators';
import { CategoriesService } from './categories.service';
import { CategoriesQueryDto, CreateCategoryDto, UpdateCategoryDto } from './dto/category.dto';

@ApiTags('categories')
@ApiBearerAuth()
@Controller('categories')
export class CategoriesController {
  constructor(private readonly categories: CategoriesService) {}

  @Get()
  list(@Query() query: CategoriesQueryDto, @CurrentUser() user: AuthUser) {
    return this.categories.list(query.includeInactive, user);
  }

  @Get(':id')
  get(@Param('id', ParseIntPipe) id: number) {
    return this.categories.get(id);
  }

  @Roles(RoleCode.MANAGER)
  @Post()
  create(@Body() dto: CreateCategoryDto) {
    return this.categories.create(dto);
  }

  @Roles(RoleCode.MANAGER)
  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateCategoryDto) {
    return this.categories.update(id, dto);
  }

  @Roles(RoleCode.MANAGER)
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.categories.remove(id);
  }
}
