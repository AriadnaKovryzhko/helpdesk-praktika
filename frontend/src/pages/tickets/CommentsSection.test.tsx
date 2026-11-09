import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Comment } from '@/api/types';
import { mockApi, renderWithProviders } from '@/test/utils';
import { CommentsSection } from './CommentsSection';

const comment = (overrides: Partial<Comment> = {}): Comment => ({
  id: 'c1',
  body: 'Текст комментария',
  author: { id: 'u1', fullName: 'Автор', email: 'a@test.ru' },
  canEdit: false,
  canDelete: false,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  ...overrides,
});

describe('CommentsSection', () => {
  it('показывает разметку как обычный текст', async () => {
    const dangerous = '<img src=x onerror=alert(1)>';
    mockApi({ 'GET /api/tickets/t1/comments': [comment({ body: dangerous })] });
    const { container } = renderWithProviders(<CommentsSection ticketId="t1" closed={false} />);
    expect(await screen.findByText(dangerous)).toBeInTheDocument();
    expect(container.querySelector('img')).toBeNull();
  });

  it('показывает пустое состояние', async () => {
    mockApi({ 'GET /api/tickets/t1/comments': [] });
    renderWithProviders(<CommentsSection ticketId="t1" closed={false} />);
    expect(await screen.findByText('Комментариев пока нет')).toBeInTheDocument();
  });

  it('показывает ошибку загрузки с повтором', async () => {
    mockApi({});
    renderWithProviders(<CommentsSection ticketId="t1" closed={false} />);
    expect(await screen.findByRole('button', { name: 'Повторить' })).toBeInTheDocument();
  });

  it('не отправляет пустой комментарий', async () => {
    const fetchMock = mockApi({ 'GET /api/tickets/t1/comments': [] });
    renderWithProviders(<CommentsSection ticketId="t1" closed={false} />);
    await userEvent.click(await screen.findByRole('button', { name: 'Отправить' }));
    expect(await screen.findByText('Введите текст комментария')).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('отправляет комментарий и очищает поле', async () => {
    const fetchMock = mockApi({
      'GET /api/tickets/t1/comments': [],
      'POST /api/tickets/t1/comments': comment(),
    });
    renderWithProviders(<CommentsSection ticketId="t1" closed={false} />);
    const field = await screen.findByLabelText('Новый комментарий');
    await userEvent.type(field, 'Добрый день');
    await userEvent.click(screen.getByRole('button', { name: 'Отправить' }));
    await waitFor(() => expect(field).toHaveValue(''));
    const post = fetchMock.mock.calls.find(([, init]) => init?.method === 'POST');
    expect(post?.[1]?.body).toBe(JSON.stringify({ body: 'Добрый день' }));
  });

  it('скрывает форму у закрытой заявки', async () => {
    mockApi({ 'GET /api/tickets/t1/comments': [] });
    renderWithProviders(<CommentsSection ticketId="t1" closed />);
    await screen.findByText('Комментариев пока нет');
    expect(screen.queryByLabelText('Новый комментарий')).not.toBeInTheDocument();
  });
});
