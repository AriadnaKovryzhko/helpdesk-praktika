import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { Button, ConfirmDialog, Pagination, StatusBadge, TextField } from '@/ui';

describe('UI-kit', () => {
  it('блокирует кнопку во время загрузки', async () => {
    const onClick = vi.fn();
    render(
      <Button loading onClick={onClick}>
        Сохранить
      </Button>,
    );
    const button = screen.getByRole('button', { name: 'Сохранить' });
    expect(button).toBeDisabled();
    await userEvent.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });

  it('связывает поле с сообщением об ошибке', () => {
    render(<TextField label="Email" error="Укажите email" />);
    const field = screen.getByLabelText('Email');
    expect(field).toHaveAttribute('aria-invalid', 'true');
    expect(field).toHaveAccessibleDescription('Укажите email');
  });

  it('показывает название статуса', () => {
    render(<StatusBadge status="WAITING_USER" />);
    expect(screen.getByText('Ожидает ответа')).toBeInTheDocument();
  });

  it('листает страницы и ограничивает края', async () => {
    const onChange = vi.fn();
    render(
      <Pagination meta={{ page: 1, pageSize: 10, total: 25, totalPages: 3 }} onChange={onChange} />,
    );
    expect(screen.getByRole('button', { name: 'Назад' })).toBeDisabled();
    await userEvent.click(screen.getByRole('button', { name: 'Вперёд' }));
    expect(onChange).toHaveBeenCalledWith(2);
  });

  it('скрывает пагинацию для одной страницы', () => {
    const { container } = render(
      <Pagination meta={{ page: 1, pageSize: 10, total: 5, totalPages: 1 }} onChange={vi.fn()} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('закрывает диалог клавишей Escape', async () => {
    const onCancel = vi.fn();
    render(
      <ConfirmDialog title="Удалить?" message="Точно?" onCancel={onCancel} onConfirm={vi.fn()} />,
    );
    await userEvent.keyboard('{Escape}');
    expect(onCancel).toHaveBeenCalled();
  });
});
