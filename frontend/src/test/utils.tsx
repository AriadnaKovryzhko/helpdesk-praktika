import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react';
import type { ReactElement } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';
import type { Role, TicketDetails, User } from '@/api/types';
import { AuthContext } from '@/auth/AuthContext';
import { ToastProvider } from '@/ui';

export function makeUser(roles: Role[] = ['USER']): User {
  return {
    id: 'u1',
    email: 'user@test.ru',
    fullName: 'Тестовый Пользователь',
    phone: null,
    roles,
    isBlocked: false,
    createdAt: '2026-01-01T00:00:00.000Z',
  };
}

export function makeTicket(overrides: Partial<TicketDetails> = {}): TicketDetails {
  return {
    id: 't1',
    number: 12,
    title: 'Не печатает принтер',
    description: 'Подробное описание проблемы',
    status: 'IN_PROGRESS',
    priority: 'HIGH',
    category: { id: 1, name: 'Оборудование' },
    author: { id: 'u1', fullName: 'Автор', email: 'a@test.ru' },
    assignee: { id: 'u2', fullName: 'Исполнитель', email: 'b@test.ru' },
    reactionDueAt: '2026-01-01T01:00:00.000Z',
    resolutionDueAt: '2026-01-01T08:00:00.000Z',
    reactedAt: '2026-01-01T00:10:00.000Z',
    resolvedAt: null,
    closedAt: null,
    reactionBreachedAt: null,
    resolutionBreachedAt: null,
    isOverdue: false,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    allowedTransitions: [],
    canEdit: false,
    canDelete: false,
    canTake: false,
    canAssign: false,
    ...overrides,
  };
}

export function renderWithProviders(
  element: ReactElement,
  { roles = ['USER'] as Role[], route = '/' } = {},
) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const auth = {
    status: 'authenticated' as const,
    user: makeUser(roles),
    hasRole: (...required: Role[]) => required.some((role) => roles.includes(role)),
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
    updateUser: vi.fn(),
  };
  const view = render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[route]}>
        <ToastProvider>
          <AuthContext.Provider value={auth}>{element}</AuthContext.Provider>
        </ToastProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  );
  return { ...view, auth };
}

type Responder = (url: string, init?: RequestInit) => unknown;

export function mockApi(routes: Record<string, Responder | unknown>) {
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const key = `${init?.method ?? 'GET'} ${url.split('?')[0]}`;
    if (!(key in routes)) {
      return new Response(JSON.stringify({ error: { code: 'NOT_MOCKED', message: key } }), {
        status: 500,
      });
    }
    const route = routes[key];
    const data = typeof route === 'function' ? (route as Responder)(url, init) : route;
    return new Response(JSON.stringify({ data, meta: null }), { status: 200 });
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}
