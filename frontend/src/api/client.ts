import type { PageMeta, Session } from './types';

export interface FieldError {
  field: string;
  messages: string[];
}

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly details: unknown = null,
  ) {
    super(message);
  }

  get fieldErrors(): FieldError[] {
    return Array.isArray(this.details) ? (this.details as FieldError[]) : [];
  }
}

export interface Envelope<T> {
  data: T;
  meta: PageMeta | null;
}

export type QueryParams = Record<string, string | number | boolean | undefined | null>;

interface RequestOptions {
  method?: string;
  body?: unknown;
  query?: QueryParams;
  retryOnUnauthorized?: boolean;
}

const API_PREFIX = '/api';
const NETWORK_ERROR = 'Не удалось связаться с сервером. Проверьте подключение к интернету';

let accessToken: string | null = null;
let onSessionLost: () => void = () => undefined;
let refreshInFlight: Promise<Session> | null = null;

export const getAccessToken = (): string | null => accessToken;
export const setAccessToken = (token: string | null): void => {
  accessToken = token;
};
export const setSessionLostHandler = (handler: () => void): void => {
  onSessionLost = handler;
};

export function buildUrl(path: string, query?: QueryParams): string {
  const params = new URLSearchParams();
  Object.entries(query ?? {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') params.set(key, String(value));
  });
  const search = params.toString();
  return `${API_PREFIX}${path}${search ? `?${search}` : ''}`;
}

async function toApiError(response: Response): Promise<ApiError> {
  const payload = (await response.json().catch(() => null)) as {
    error?: { code: string; message: string; details: unknown };
  } | null;
  return new ApiError(
    response.status,
    payload?.error?.code ?? 'UNKNOWN_ERROR',
    payload?.error?.message ?? 'Что-то пошло не так, попробуйте ещё раз',
    payload?.error?.details ?? null,
  );
}

async function send(path: string, options: RequestOptions, body?: BodyInit): Promise<Response> {
  const headers: Record<string, string> = {};
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
  if (options.body !== undefined && !(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }
  try {
    return await fetch(buildUrl(path, options.query), {
      method: options.method ?? 'GET',
      credentials: 'include',
      headers,
      body,
    });
  } catch {
    throw new ApiError(0, 'NETWORK_ERROR', NETWORK_ERROR);
  }
}

// Блокировка не даёт двум вкладкам одновременно предъявить один и тот же refresh-токен.
function withTabLock<T>(task: () => Promise<T>): Promise<T> {
  return navigator.locks
    ? (navigator.locks.request('helpdesk-refresh', task) as unknown as Promise<T>)
    : task();
}

export function refreshSession(): Promise<Session> {
  refreshInFlight ??= withTabLock(async () => {
    const response = await send('/auth/refresh', { method: 'POST' });
    if (!response.ok) throw await toApiError(response);
    const { data } = (await response.json()) as Envelope<Session>;
    accessToken = data.accessToken;
    return data;
  }).finally(() => {
    refreshInFlight = null;
  });
  return refreshInFlight;
}

async function fetchWithRefresh(path: string, options: RequestOptions): Promise<Response> {
  const body =
    options.body instanceof FormData
      ? options.body
      : options.body !== undefined
        ? JSON.stringify(options.body)
        : undefined;
  let response = await send(path, options, body);
  if (response.status === 401 && options.retryOnUnauthorized !== false) {
    try {
      await refreshSession();
    } catch {
      accessToken = null;
      onSessionLost();
      throw await toApiError(response);
    }
    response = await send(path, options, body);
  }
  return response;
}

export async function request<T>(path: string, options: RequestOptions = {}): Promise<Envelope<T>> {
  const response = await fetchWithRefresh(path, options);
  if (!response.ok) throw await toApiError(response);
  if (response.status === 204) return { data: undefined as T, meta: null };
  return (await response.json()) as Envelope<T>;
}

export const api = {
  get: <T>(path: string, query?: QueryParams) => request<T>(path, { query }).then((r) => r.data),
  page: <T>(path: string, query?: QueryParams) => request<T>(path, { query }),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'POST', body }).then((r) => r.data),
  put: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'PUT', body }).then((r) => r.data),
  patch: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'PATCH', body }).then((r) => r.data),
  delete: (path: string) => request<void>(path, { method: 'DELETE' }).then(() => undefined),
};

export async function downloadFile(path: string, fileName: string): Promise<void> {
  const response = await fetchWithRefresh(path, {});
  if (!response.ok) throw await toApiError(response);
  const url = URL.createObjectURL(await response.blob());
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}
