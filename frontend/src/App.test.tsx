import { render, screen } from '@testing-library/react';
import { afterEach, beforeEach, vi } from 'vitest';
import { App } from './App';

describe('App', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ error: { code: 'INVALID_SESSION', message: 'нет' } }), {
          status: 401,
        }),
      ),
    );
  });

  afterEach(() => vi.unstubAllGlobals());

  it('показывает проверку входа, пока сессия неизвестна', () => {
    render(<App />);
    expect(screen.getByRole('status')).toHaveTextContent('Проверяем вход');
  });

  it('перенаправляет гостя на страницу входа', async () => {
    render(<App />);
    expect(await screen.findByRole('heading', { name: 'Вход' })).toBeInTheDocument();
  });
});
