import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { ApiError } from '@/api/client';
import { mockApi, renderWithProviders } from '@/test/utils';
import { TicketForm } from './TicketForm';

const categories = [{ id: 3, name: 'Сеть', description: null, isActive: true }];

describe('TicketForm', () => {
  it('проверяет обязательные поля на клиенте', async () => {
    mockApi({ 'GET /api/categories': categories });
    const onSubmit = vi.fn();
    renderWithProviders(<TicketForm submitLabel="Создать" onSubmit={onSubmit} />);
    await userEvent.click(screen.getByRole('button', { name: 'Создать' }));
    expect(
      await screen.findByText('Тема должна содержать от 5 до 200 символов'),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Категория')).toHaveAccessibleDescription('Выберите категорию');
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('передаёт нормализованные значения', async () => {
    mockApi({ 'GET /api/categories': categories });
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    renderWithProviders(<TicketForm submitLabel="Создать" onSubmit={onSubmit} />);
    await screen.findByRole('option', { name: 'Сеть' });
    await userEvent.type(screen.getByLabelText('Тема'), '  Нет интернета  ');
    await userEvent.type(screen.getByLabelText('Описание'), 'Пропал доступ в сеть');
    await userEvent.selectOptions(screen.getByLabelText('Категория'), '3');
    await userEvent.selectOptions(screen.getByLabelText('Приоритет'), 'CRITICAL');
    await userEvent.click(screen.getByRole('button', { name: 'Создать' }));
    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith({
        title: 'Нет интернета',
        description: 'Пропал доступ в сеть',
        categoryId: 3,
        priority: 'CRITICAL',
      }),
    );
  });

  it('подсвечивает поле по ответу сервера', async () => {
    mockApi({ 'GET /api/categories': categories });
    const onSubmit = vi
      .fn()
      .mockRejectedValue(
        new ApiError(400, 'VALIDATION_ERROR', 'Проверьте правильность заполнения полей', [
          { field: 'title', messages: ['Такая тема запрещена'] },
        ]),
      );
    renderWithProviders(<TicketForm submitLabel="Создать" onSubmit={onSubmit} />);
    await screen.findByRole('option', { name: 'Сеть' });
    await userEvent.type(screen.getByLabelText('Тема'), 'Тема заявки');
    await userEvent.type(screen.getByLabelText('Описание'), 'Описание заявки длинное');
    await userEvent.selectOptions(screen.getByLabelText('Категория'), '3');
    await userEvent.click(screen.getByRole('button', { name: 'Создать' }));
    expect(await screen.findByText('Такая тема запрещена')).toBeInTheDocument();
    expect(screen.getByLabelText('Тема')).toHaveAttribute('aria-invalid', 'true');
  });
});
