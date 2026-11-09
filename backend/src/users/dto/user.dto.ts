import { RoleCode } from '@prisma/client';
import { Transform } from 'class-transformer';
import {
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsEnum,
  IsIn,
  IsOptional,
  IsString,
  Length,
  Matches,
  MaxLength,
  ValidateIf,
} from 'class-validator';
import { PaginationQueryDto, ToBoolean } from '../../common/dto/pagination.dto';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);
const SORT_FIELDS = ['fullName', 'email', 'createdAt'] as const;

export class UsersQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsIn(SORT_FIELDS, { message: 'Недопустимое поле сортировки' })
  sortBy: (typeof SORT_FIELDS)[number] = 'createdAt';

  @IsOptional()
  @IsEnum(RoleCode, { message: 'Выберите роль из списка' })
  role?: RoleCode;

  @IsOptional()
  @ToBoolean()
  @IsBoolean({ message: 'Фильтр блокировки: true или false' })
  isBlocked?: boolean;
}

export class UpdateProfileDto {
  @IsOptional()
  @Transform(trim)
  @IsString({ message: 'Укажите ФИО' })
  @Length(2, 120, { message: 'ФИО должно содержать от 2 до 120 символов' })
  fullName?: string;

  @ValidateIf((_object, value) => value !== null && value !== undefined && value !== '')
  @Transform(trim)
  @Matches(/^\+?[\d\s()-]{5,32}$/, { message: 'Укажите телефон в формате +7 900 000-00-00' })
  phone?: string | null;
}

export class ChangePasswordDto {
  @IsString({ message: 'Укажите текущий пароль' })
  @Length(1, 128, { message: 'Укажите текущий пароль' })
  currentPassword: string;

  @IsString({ message: 'Длина пароля должна быть от 8 до 128 символов' })
  @Length(8, 128, { message: 'Длина пароля должна быть от 8 до 128 символов' })
  @Matches(/^(?=.*[A-Za-zА-Яа-яЁё])(?=.*\d).+$/, {
    message: 'Пароль должен содержать буквы и цифры',
  })
  @MaxLength(128, { message: 'Пароль слишком длинный' })
  newPassword: string;
}

export class UpdateRolesDto {
  @IsArray({ message: 'Укажите список ролей' })
  @ArrayMinSize(1, { message: 'Выберите хотя бы одну роль' })
  @ArrayUnique({ message: 'Роли не должны повторяться' })
  @IsEnum(RoleCode, { each: true, message: 'Выберите роль из списка' })
  roles: RoleCode[];
}
