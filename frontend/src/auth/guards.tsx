import { Navigate, Outlet, useLocation } from 'react-router-dom';
import type { Role } from '@/api/types';
import { EmptyState, LoadingState } from '@/ui';
import { useAuth } from './AuthContext';

export function RequireAuth() {
  const { status } = useAuth();
  const location = useLocation();
  if (status === 'loading') return <LoadingState label="Проверяем вход…" />;
  if (status === 'anonymous') return <Navigate to="/login" replace state={{ from: location }} />;
  return <Outlet />;
}

export function RequireRole({ roles }: { roles: Role[] }) {
  const { hasRole } = useAuth();
  if (!hasRole(...roles)) {
    return (
      <EmptyState
        title="Недостаточно прав"
        description="У вашей роли нет доступа к этому разделу."
      />
    );
  }
  return <Outlet />;
}

export function GuestOnly() {
  const { status } = useAuth();
  if (status === 'loading') return <LoadingState label="Проверяем вход…" />;
  if (status === 'authenticated') return <Navigate to="/tickets" replace />;
  return <Outlet />;
}
