export const isEmail = (value: string): boolean => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());

export function passwordError(value: string): string | undefined {
  if (value.length < 8 || value.length > 128)
    return 'Длина пароля должна быть от 8 до 128 символов';
  if (!/[A-Za-zА-Яа-яЁё]/.test(value) || !/\d/.test(value)) {
    return 'Пароль должен содержать буквы и цифры';
  }
  return undefined;
}

export const emailError = (value: string): string | undefined =>
  isEmail(value) ? undefined : 'Укажите корректный email';
