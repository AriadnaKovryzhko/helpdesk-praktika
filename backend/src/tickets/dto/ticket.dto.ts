import { PartialType } from '@nestjs/swagger';
import { TicketPriority, TicketStatus } from '@prisma/client';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  MaxLength,
} from 'class-validator';
import { PaginationQueryDto, ToBoolean } from '../../common/dto/pagination.dto';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);
const PRIORITY_MESSAGE = 'Выберите приоритет из списка';
const STATUS_MESSAGE = 'Выберите статус из списка';
const SORT_FIELDS = [
  'number',
  'createdAt',
  'updatedAt',
  'priority',
  'status',
  'resolutionDueAt',
] as const;

export class CreateTicketDto {
  @Transform(trim)
  @IsString({ message: 'Укажите тему заявки' })
  @Length(5, 200, { message: 'Тема должна содержать от 5 до 200 символов' })
  title: string;

  @Transform(trim)
  @IsString({ message: 'Опишите проблему' })
  @Length(10, 5000, { message: 'Описание должно содержать от 10 до 5000 символов' })
  description: string;

  @Type(() => Number)
  @IsInt({ message: 'Выберите категорию из списка' })
  categoryId: number;

  @IsEnum(TicketPriority, { message: PRIORITY_MESSAGE })
  priority: TicketPriority;
}

export class UpdateTicketDto extends PartialType(CreateTicketDto) {}

export class ChangeStatusDto {
  @IsEnum(TicketStatus, { message: STATUS_MESSAGE })
  status: TicketStatus;

  @IsOptional()
  @Transform(trim)
  @IsString({ message: 'Комментарий должен быть строкой' })
  @MaxLength(500, { message: 'Комментарий не длиннее 500 символов' })
  comment?: string;
}

export class AssignTicketDto {
  @IsOptional()
  @IsUUID('all', { message: 'Выберите исполнителя из списка' })
  assigneeId?: string;
}

export class TicketsQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsIn(SORT_FIELDS, { message: 'Недопустимое поле сортировки' })
  sortBy: (typeof SORT_FIELDS)[number] = 'createdAt';

  @IsOptional()
  @IsEnum(TicketStatus, { message: STATUS_MESSAGE })
  status?: TicketStatus;

  @IsOptional()
  @IsEnum(TicketPriority, { message: PRIORITY_MESSAGE })
  priority?: TicketPriority;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Недопустимая категория' })
  categoryId?: number;

  @IsOptional()
  @IsUUID('all', { message: 'Недопустимый исполнитель' })
  assigneeId?: string;

  @IsOptional()
  @ToBoolean()
  @IsBoolean({ message: 'Фильтр просрочки: true или false' })
  overdue?: boolean;

  @IsOptional()
  @ToBoolean()
  @IsBoolean({ message: 'Фильтр назначенных заявок: true или false' })
  assignedToMe?: boolean;

  @IsOptional()
  @ToBoolean()
  @IsBoolean({ message: 'Фильтр созданных заявок: true или false' })
  createdByMe?: boolean;
}
