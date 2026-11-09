import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { vi } from 'vitest';
import type { Role } from '@/api/types';
import { AuthContext } from './AuthContext';
import { RequireAuth, RequireRole } from './guards';

function renderGuard(status: 'loading' | 'authenticated' | 'anonymous', roles: Role[] = []) {
  const value = {
    status,
    user: null,
    hasRole: (...required: Role[]) => required.some((role) => roles.includes(role)),
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
    updateUser: vi.fn(),
  };
  render(
    <AuthContext.Provider value={value}>
      <MemoryRouter initialEntries={['/secret']}>
        <Routes>
          <Route path="/login" element={<p>Страница входа</p>} />
          <Route element={<RequireAuth />}>
            <Route element={<RequireRole roles={['MANAGER']} />}>
              <Route path="/secret" element={<p>Панель руководителя</p>} />
            </Route>
          </Route>
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>,
  );
}

describe('защита маршрутов', () => {
  it('ждёт проверку сессии', () => {
    renderGuard('loading');
    expect(screen.getByRole('status')).toHaveTextContent('Проверяем вход');
  });

  it('отправляет гостя на вход', () => {
    renderGuard('anonymous');
    expect(screen.getByText('Страница входа')).toBeInTheDocument();
  });

  it('не пускает пользователя без роли', () => {
    renderGuard('authenticated', ['USER']);
    expect(screen.getByText('Недостаточно прав')).toBeInTheDocument();
    expect(screen.queryByText('Панель руководителя')).not.toBeInTheDocument();
  });

  it('пускает руководителя', () => {
    renderGuard('authenticated', ['MANAGER']);
    expect(screen.getByText('Панель руководителя')).toBeInTheDocument();
  });
});
