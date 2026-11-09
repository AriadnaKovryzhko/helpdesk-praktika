import { IsBoolean, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';
import { IsInt, Max, Min } from 'class-validator';
import { ToBoolean } from '../../common/dto/pagination.dto';

export class NotificationsQueryDto {
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
  @ToBoolean()
  @IsBoolean({ message: 'Параметр unreadOnly: true или false' })
  unreadOnly?: boolean;
}
