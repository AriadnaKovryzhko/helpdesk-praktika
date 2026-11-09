import { Navigate, Route, Routes } from 'react-router-dom';
import { GuestOnly, RequireAuth, RequireRole } from '@/auth/guards';
import { AppShell } from '@/layout/AppShell';
import { NotFoundPage } from '@/pages/NotFoundPage';
import { LoginPage } from '@/pages/auth/LoginPage';
import { RegisterPage } from '@/pages/auth/RegisterPage';
import { ForgotPasswordPage } from '@/pages/auth/ForgotPasswordPage';
import { ResetPasswordPage } from '@/pages/auth/ResetPasswordPage';
import { Placeholder } from '@/pages/Placeholder';

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<GuestOnly />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
      </Route>
      <Route element={<RequireAuth />}>
        <Route element={<AppShell />}>
          <Route index element={<Navigate to="/tickets" replace />} />
          <Route path="/tickets" element={<Placeholder title="Заявки" />} />
          <Route path="/tickets/new" element={<Placeholder title="Новая заявка" />} />
          <Route path="/tickets/:id" element={<Placeholder title="Карточка заявки" />} />
          <Route path="/profile" element={<Placeholder title="Личный кабинет" />} />
          <Route path="/notifications" element={<Placeholder title="Уведомления" />} />
          <Route element={<RequireRole roles={['MANAGER']} />}>
            <Route path="/dashboard" element={<Placeholder title="Дашборд" />} />
            <Route path="/admin/users" element={<Placeholder title="Пользователи" />} />
            <Route path="/admin/categories" element={<Placeholder title="Категории" />} />
            <Route path="/admin/sla" element={<Placeholder title="SLA-политики" />} />
            <Route path="/admin/audit" element={<Placeholder title="Журнал аудита" />} />
          </Route>
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Route>
    </Routes>
  );
}
