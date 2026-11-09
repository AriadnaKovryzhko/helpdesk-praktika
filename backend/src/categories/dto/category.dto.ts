import { PartialType } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional, IsString, Length, MaxLength, ValidateIf } from 'class-validator';
import { ToBoolean } from '../../common/dto/pagination.dto';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

export class CreateCategoryDto {
  @Transform(trim)
  @IsString({ message: 'Укажите название' })
  @Length(2, 80, { message: 'Название должно содержать от 2 до 80 символов' })
  name: string;

  @ValidateIf((_object, value) => value !== null && value !== undefined)
  @Transform(trim)
  @IsString({ message: 'Описание должно быть строкой' })
  @MaxLength(300, { message: 'Описание не длиннее 300 символов' })
  description?: string | null;

  @IsOptional()
  @IsBoolean({ message: 'Признак активности: да или нет' })
  isActive?: boolean;
}

export class UpdateCategoryDto extends PartialType(CreateCategoryDto) {}

export class CategoriesQueryDto {
  @IsOptional()
  @ToBoolean()
  @IsBoolean({ message: 'Параметр includeInactive: true или false' })
  includeInactive?: boolean;
}
