import { Transform } from 'class-transformer';
import { IsString, Length } from 'class-validator';

export class CommentDto {
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  @IsString({ message: 'Введите текст комментария' })
  @Length(1, 5000, { message: 'Комментарий должен содержать от 1 до 5000 символов' })
  body: string;
}
