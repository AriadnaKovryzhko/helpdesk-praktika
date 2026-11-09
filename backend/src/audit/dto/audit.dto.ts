import { IsDateString, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination.dto';

export class AuditQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsString({ message: 'Действие должно быть строкой' })
  @MaxLength(64, { message: 'Слишком длинное значение действия' })
  action?: string;

  @IsOptional()
  @IsString({ message: 'Тип объекта должен быть строкой' })
  @MaxLength(32, { message: 'Слишком длинный тип объекта' })
  entityType?: string;

  @IsOptional()
  @IsUUID('all', { message: 'Недопустимый пользователь' })
  actorId?: string;

  @IsOptional()
  @IsDateString({}, { message: 'Укажите корректную дату начала' })
  dateFrom?: string;

  @IsOptional()
  @IsDateString({}, { message: 'Укажите корректную дату окончания' })
  dateTo?: string;
}
