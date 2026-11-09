import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ApiError } from '@/api/client';
import { renderWithProviders } from '@/test/utils';
import { LoginPage } from './LoginPage';

describe('LoginPage', () => {
  it('показывает ошибки при пустой форме и не отправляет её', async () => {
    const { auth } = renderWithProviders(<LoginPage />);
    await userEvent.click(screen.getByRole('button', { name: 'Войти' }));
    expect(await screen.findByText('Укажите корректный email')).toBeInTheDocument();
    expect(screen.getByText('Укажите пароль')).toBeInTheDocument();
    expect(auth.login).not.toHaveBeenCalled();
  });

  it('отправляет корректные данные', async () => {
    const { auth } = renderWithProviders(<LoginPage />);
    await userEvent.type(screen.getByLabelText('Email'), 'user@test.ru');
    await userEvent.type(screen.getByLabelText('Пароль'), 'Secret123');
    await userEvent.click(screen.getByRole('button', { name: 'Войти' }));
    await waitFor(() => expect(auth.login).toHaveBeenCalledWith('user@test.ru', 'Secret123'));
  });

  it('показывает сообщение сервера', async () => {
    const { auth } = renderWithProviders(<LoginPage />);
    auth.login.mockRejectedValue(
      new ApiError(401, 'INVALID_CREDENTIALS', 'Неверный email или пароль'),
    );
    await userEvent.type(screen.getByLabelText('Email'), 'user@test.ru');
    await userEvent.type(screen.getByLabelText('Пароль'), 'Wrong1234');
    await userEvent.click(screen.getByRole('button', { name: 'Войти' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Неверный email или пароль');
  });
});
