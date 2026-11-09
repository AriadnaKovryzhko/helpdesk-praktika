import { Transform, Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export const ToBoolean = () =>
  Transform(({ obj, key }: { obj: Record<string, unknown>; key: string }) => {
    const value = obj[key];
    if (value === 'true' || value === true) return true;
    if (value === 'false' || value === false) return false;
    return value;
  });

export class PaginationQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Номер страницы должен быть целым числом' })
  @Min(1, { message: 'Номер страницы должен быть не меньше 1' })
  page: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Размер страницы должен быть целым числом' })
  @Min(1, { message: 'Размер страницы должен быть не меньше 1' })
  @Max(100, { message: 'Размер страницы должен быть не больше 100' })
  pageSize: number = 20;

  @IsOptional()
  @IsString({ message: 'Поисковый запрос должен быть строкой' })
  @MaxLength(100, { message: 'Поисковый запрос слишком длинный' })
  search?: string;

  @IsOptional()
  @IsIn(['asc', 'desc'], { message: 'Порядок сортировки: asc или desc' })
  sortOrder: 'asc' | 'desc' = 'desc';
}
