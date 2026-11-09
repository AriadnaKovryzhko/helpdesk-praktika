import { Transform } from 'class-transformer';
import { IsEmail, IsNotEmpty, IsString, Length, Matches, MaxLength } from 'class-validator';

const PASSWORD_RULE = /^(?=.*[A-Za-zА-Яа-яЁё])(?=.*\d).+$/;
const PASSWORD_MESSAGE = 'Пароль должен содержать буквы и цифры';
const PASSWORD_LENGTH_MESSAGE = 'Длина пароля должна быть от 8 до 128 символов';
const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

export class PasswordFields {
  @IsString({ message: PASSWORD_LENGTH_MESSAGE })
  @Length(8, 128, { message: PASSWORD_LENGTH_MESSAGE })
  @Matches(PASSWORD_RULE, { message: PASSWORD_MESSAGE })
  password: string;
}

export class RegisterDto extends PasswordFields {
  @Transform(trim)
  @IsEmail({}, { message: 'Укажите корректный email' })
  @MaxLength(254, { message: 'Email слишком длинный' })
  email: string;

  @Transform(trim)
  @IsString({ message: 'Укажите ФИО' })
  @Length(2, 120, { message: 'ФИО должно содержать от 2 до 120 символов' })
  fullName: string;
}

export class LoginDto {
  @Transform(trim)
  @IsEmail({}, { message: 'Укажите корректный email' })
  email: string;

  @IsString({ message: 'Укажите пароль' })
  @IsNotEmpty({ message: 'Укажите пароль' })
  @MaxLength(128, { message: 'Пароль слишком длинный' })
  password: string;
}

export class ForgotPasswordDto {
  @Transform(trim)
  @IsEmail({}, { message: 'Укажите корректный email' })
  email: string;
}

export class ResetPasswordDto extends PasswordFields {
  @IsString({ message: 'Ссылка для восстановления недействительна' })
  @IsNotEmpty({ message: 'Ссылка для восстановления недействительна' })
  @MaxLength(128, { message: 'Ссылка для восстановления недействительна' })
  token: string;
}
