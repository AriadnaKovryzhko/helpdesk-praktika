import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { api } from '@/api/client';
import { useTickets } from '@/api/tickets';
import type { User } from '@/api/types';
import { useAuth } from '@/auth/AuthContext';
import { PageHeader } from '@/layout/AppShell';
import { formatDateTime } from '@/lib/format';
import { ROLE_LABELS } from '@/lib/labels';
import { useFormErrors } from '@/lib/useFormErrors';
import { passwordError } from '@/lib/validation';
import {
  Button,
  Card,
  EmptyState,
  ErrorState,
  FormError,
  LoadingState,
  Pagination,
  StatusBadge,
  TextField,
  useToast,
} from '@/ui';

function ProfileForm({ user }: { user: User }) {
  const { updateUser } = useAuth();
  const toast = useToast();
  const [fullName, setFullName] = useState(user.fullName);
  const [phone, setPhone] = useState(user.phone ?? '');
  const [saving, setSaving] = useState(false);
  const { errors, formError, showClientErrors, showServerError } = useFormErrors();

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const valid = showClientErrors({
      fullName: fullName.trim().length >= 2 ? undefined : 'Укажите ФИО',
      phone:
        !phone.trim() || /^\+?[\d\s()-]{5,32}$/.test(phone.trim())
          ? undefined
          : 'Укажите телефон в формате +7 900 000-00-00',
    });
    if (!valid) return;
    setSaving(true);
    try {
      updateUser(
        await api.patch<User>('/users/me', { fullName: fullName.trim(), phone: phone.trim() }),
      );
      toast.success('Профиль сохранён');
    } catch (error) {
      showServerError(error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="p-5">
      <h2 className="mb-4 font-semibold text-ink-900">Профиль</h2>
      <form noValidate onSubmit={(event) => void submit(event)} className="flex flex-col gap-4">
        <FormError message={formError} />
        <TextField label="Email" value={user.email} disabled />
        <TextField
          label="ФИО"
          value={fullName}
          error={errors.fullName}
          onChange={(event) => setFullName(event.target.value)}
        />
        <TextField
          label="Телефон"
          value={phone}
          error={errors.phone}
          onChange={(event) => setPhone(event.target.value)}
        />
        <p className="text-sm text-ink-600">
          Роли: {user.roles.map((role) => ROLE_LABELS[role]).join(', ')}
        </p>
        <div className="flex justify-end">
          <Button type="submit" loading={saving}>
            Сохранить
          </Button>
        </div>
      </form>
    </Card>
  );
}

function PasswordForm() {
  const toast = useToast();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const { errors, formError, showClientErrors, showServerError } = useFormErrors();

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const valid = showClientErrors({
      currentPassword: currentPassword ? undefined : 'Укажите текущий пароль',
      newPassword: passwordError(newPassword),
    });
    if (!valid) return;
    setSaving(true);
    try {
      await api.post('/users/me/password', { currentPassword, newPassword });
      setCurrentPassword('');
      setNewPassword('');
      toast.success('Пароль изменён');
    } catch (error) {
      showServerError(error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="p-5">
      <h2 className="mb-4 font-semibold text-ink-900">Смена пароля</h2>
      <form noValidate onSubmit={(event) => void submit(event)} className="flex flex-col gap-4">
        <FormError message={formError} />
        <TextField
          label="Текущий пароль"
          type="password"
          autoComplete="current-password"
          value={currentPassword}
          error={errors.currentPassword}
          onChange={(event) => setCurrentPassword(event.target.value)}
        />
        <TextField
          label="Новый пароль"
          type="password"
          autoComplete="new-password"
          hint="Не короче 8 символов, буквы и цифры"
          value={newPassword}
          error={errors.newPassword}
          onChange={(event) => setNewPassword(event.target.value)}
        />
        <div className="flex justify-end">
          <Button type="submit" loading={saving}>
            Изменить пароль
          </Button>
        </div>
      </form>
    </Card>
  );
}

function TicketHistory() {
  const [page, setPage] = useState(1);
  const { hasRole } = useAuth();
  const isRequester = hasRole('USER');
  const tickets = useTickets({
    ...(isRequester ? { createdByMe: true } : { assignedToMe: true }),
    page,
    pageSize: 10,
  });
  return (
    <Card className="p-5">
      <h2 className="mb-2 font-semibold text-ink-900">
        {isRequester ? 'История заявок' : 'Назначенные заявки'}
      </h2>
      {tickets.isPending ? (
        <LoadingState />
      ) : tickets.isError ? (
        <ErrorState error={tickets.error} onRetry={() => void tickets.refetch()} />
      ) : tickets.data.data.length === 0 ? (
        <EmptyState title={isRequester ? 'Вы ещё не создавали заявок' : 'Назначенных заявок нет'} />
      ) : (
        <ul>
          {tickets.data.data.map((ticket) => (
            <li key={ticket.id} className="border-t border-ink-100 first:border-t-0">
              <Link
                to={`/tickets/${ticket.id}`}
                className="flex flex-wrap items-center justify-between gap-2 py-3 hover:text-brand-600"
              >
                <span className="min-w-0 flex-1 truncate text-sm">
                  №{ticket.number} {ticket.title}
                </span>
                <span className="flex items-center gap-3">
                  <StatusBadge status={ticket.status} />
                  <span className="text-xs text-ink-500">{formatDateTime(ticket.createdAt)}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
      {tickets.data?.meta && <Pagination meta={tickets.data.meta} onChange={setPage} />}
    </Card>
  );
}

export function ProfilePage() {
  const { user } = useAuth();
  if (!user) return null;
  return (
    <>
      <PageHeader title="Личный кабинет" />
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="flex flex-col gap-4">
          <ProfileForm user={user} />
          <PasswordForm />
        </div>
        <TicketHistory />
      </div>
    </>
  );
}
