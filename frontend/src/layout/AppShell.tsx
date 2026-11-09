import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import type { Role } from '@/api/types';
import { useAuth } from '@/auth/AuthContext';
import { cn } from '@/lib/cn';
import { ROLE_LABELS } from '@/lib/labels';
import { NotificationBell } from '@/realtime/NotificationBell';
import { Button } from '@/ui';

interface NavItem {
  to: string;
  label: string;
  roles?: Role[];
}

const NAV_ITEMS: NavItem[] = [
  { to: '/tickets', label: 'Заявки' },
  { to: '/profile', label: 'Личный кабинет' },
  { to: '/dashboard', label: 'Дашборд', roles: ['MANAGER'] },
  { to: '/admin/users', label: 'Пользователи', roles: ['MANAGER'] },
  { to: '/admin/categories', label: 'Категории', roles: ['MANAGER'] },
  { to: '/admin/sla', label: 'SLA-политики', roles: ['MANAGER'] },
  { to: '/admin/audit', label: 'Журнал аудита', roles: ['MANAGER'] },
];

function Navigation() {
  const { hasRole } = useAuth();
  return (
    <nav aria-label="Основное меню" className="flex flex-col gap-1">
      {NAV_ITEMS.filter((item) => !item.roles || hasRole(...item.roles)).map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          className={({ isActive }) =>
            cn(
              'rounded-lg px-3 py-2 text-sm font-medium transition-colors',
              isActive
                ? 'bg-white/10 text-white'
                : 'text-ink-300 hover:bg-white/5 hover:text-white',
            )
          }
        >
          {item.label}
        </NavLink>
      ))}
    </nav>
  );
}

function UserFooter() {
  const { user, logout } = useAuth();
  if (!user) return null;
  return (
    <div className="border-t border-white/10 pt-4">
      <p className="truncate text-sm font-medium text-white">{user.fullName}</p>
      <p className="mb-3 text-xs text-ink-400">
        {user.roles.map((role) => ROLE_LABELS[role]).join(', ')}
      </p>
      <Button variant="inverse" size="sm" className="w-full" onClick={() => void logout()}>
        Выйти
      </Button>
    </div>
  );
}

const SIDEBAR = 'flex h-full flex-col gap-6 bg-ink-900 p-4';

export function AppShell() {
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();

  useEffect(() => setMenuOpen(false), [location.pathname]);

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[240px_minmax(0,1fr)]">
      <aside className="sticky top-0 hidden h-screen lg:block">
        <div className={SIDEBAR}>
          <Link to="/tickets" className="px-3 text-lg font-semibold text-white">
            Help Desk
          </Link>
          <div className="flex-1 overflow-y-auto">
            <Navigation />
          </div>
          <UserFooter />
        </div>
      </aside>

      {menuOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button
            aria-label="Закрыть меню"
            className="absolute inset-0 bg-ink-900/50"
            onClick={() => setMenuOpen(false)}
          />
          <div className="absolute inset-y-0 left-0 w-64 max-w-[85vw]">
            <div className={SIDEBAR}>
              <p className="px-3 text-lg font-semibold text-white">Help Desk</p>
              <div className="flex-1 overflow-y-auto">
                <Navigation />
              </div>
              <UserFooter />
            </div>
          </div>
        </div>
      )}

      <div className="flex min-w-0 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-3 border-b border-ink-200 bg-white px-4 lg:justify-end">
          <button
            aria-label="Открыть меню"
            className="rounded-lg border border-ink-200 px-3 py-1.5 text-sm text-ink-700 lg:hidden"
            onClick={() => setMenuOpen(true)}
          >
            Меню
          </button>
          <NotificationBell />
        </header>
        <main className="mx-auto w-full max-w-[1400px] flex-1 p-4 sm:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        <h1 className="break-words text-xl font-semibold text-ink-900 sm:text-2xl">{title}</h1>
        {description && <p className="mt-1 text-sm text-ink-500">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}
