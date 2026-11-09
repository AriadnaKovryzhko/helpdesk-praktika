import { afterEach, describe, expect, it, vi } from 'vitest';
import { api, ApiError, buildUrl, getAccessToken, setAccessToken } from './client';

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });

describe('клиент API', () => {
  afterEach(() => setAccessToken(null));

  it('пропускает пустые параметры запроса', () => {
    expect(buildUrl('/tickets', { page: 2, search: '', status: undefined, overdue: false })).toBe(
      '/api/tickets?page=2&overdue=false',
    );
  });

  it('обновляет токен один раз и повторяет запрос при 401', async () => {
    setAccessToken('old');
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(json({ error: { code: 'INVALID_SESSION', message: 'x' } }, 401))
      .mockResolvedValueOnce(json({ data: { accessToken: 'new', user: {} }, meta: null }))
      .mockResolvedValueOnce(json({ data: { ok: true }, meta: null }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(api.get('/users/me')).resolves.toEqual({ ok: true });
    expect(getAccessToken()).toBe('new');
    expect(fetchMock.mock.calls[2][1].headers.Authorization).toBe('Bearer new');
  });

  it('передаёт ошибку сервера с кодом и полями', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        json(
          {
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Ошибка',
              details: [{ field: 'email', messages: ['Неверно'] }],
            },
          },
          400,
        ),
      ),
    );
    const error = (await api.post('/x').catch((caught: unknown) => caught)) as ApiError;
    expect(error).toBeInstanceOf(ApiError);
    expect(error.code).toBe('VALIDATION_ERROR');
    expect(error.fieldErrors[0].field).toBe('email');
  });

  it('сообщает о сбое сети на русском', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('failed')));
    await expect(api.get('/x')).rejects.toThrow('Не удалось связаться с сервером');
  });
});
