import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { api } from '@/api/client';
import type { Role, User } from '@/api/types';
import { useAuth } from '@/auth/AuthContext';
import { PageHeader } from '@/layout/AppShell';
import { formatDateTime } from '@/lib/format';
import { ROLES, ROLE_LABELS } from '@/lib/labels';
import { useDebouncedValue } from '@/lib/useDebouncedValue';
import {
  Badge,
  Button,
  Card,
  ConfirmDialog,
  EmptyState,
  ErrorState,
  LoadingState,
  Modal,
  Pagination,
  SelectField,
  TextField,
  useToast,
} from '@/ui';

function RolesDialog({
  user,
  saving,
  onClose,
  onSave,
}: {
  user: User;
  saving: boolean;
  onClose: () => void;
  onSave: (roles: Role[]) => void;
}) {
  const [roles, setRoles] = useState<Role[]>(user.roles);
  const toggle = (role: Role) =>
    setRoles((current) => {
      if (current.includes(role)) return current.filter((item) => item !== role);
      return role === 'USER' ? ['USER'] : [...current.filter((item) => item !== 'USER'), role];
    });

  return (
    <Modal
      title={`Роли: ${user.fullName}`}
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Отмена
          </Button>
          <Button disabled={roles.length === 0} loading={saving} onClick={() => onSave(roles)}>
            Сохранить
          </Button>
        </>
      }
    >
      <fieldset className="flex flex-col gap-2">
        <legend className="sr-only">Роли пользователя</legend>
        {ROLES.map((role) => (
          <label key={role} className="flex items-center gap-2 text-sm text-ink-800">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-ink-300"
              checked={roles.includes(role)}
              onChange={() => toggle(role)}
            />
            {ROLE_LABELS[role]}
          </label>
        ))}
      </fieldset>
      <p className="mt-3 text-xs text-ink-500">
        Роль «Пользователь» не совмещается с ролями сотрудников.
      </p>
      {roles.length === 0 && (
        <p role="alert" className="mt-2 text-xs text-red-600">
          Выберите хотя бы одну роль
        </p>
      )}
    </Modal>
  );
}

export function UsersPage() {
  const { user: currentUser } = useAuth();
  const queryClient = useQueryClient();
  const toast = useToast();
  const [searchInput, setSearchInput] = useState('');
  const search = useDebouncedValue(searchInput);
  const [role, setRole] = useState('');
  const [blocked, setBlocked] = useState('');
  const [sort, setSort] = useState('createdAt:desc');
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<User | null>(null);
  const [blocking, setBlocking] = useState<User | null>(null);
  const [sortBy, sortOrder] = sort.split(':');

  const query = { page, pageSize: 15, search, role, isBlocked: blocked, sortBy, sortOrder };
  const users = useQuery({
    queryKey: ['users', query],
    queryFn: () => api.page<User[]>('/users', query),
    placeholderData: keepPreviousData,
  });

  const onError = (error: Error) => toast.error(error.message);
  const refresh = () => queryClient.invalidateQueries({ queryKey: ['users'] });

  const saveRoles = useMutation({
    mutationFn: (roles: Role[]) => api.put(`/users/${editing?.id}/roles`, { roles }),
    onSuccess: async () => {
      await refresh();
      setEditing(null);
      toast.success('Роли изменены');
    },
    onError,
  });

  const toggleBlock = useMutation({
    mutationFn: (target: User) =>
      api.post(`/users/${target.id}/${target.isBlocked ? 'unblock' : 'block'}`),
    onSuccess: async () => {
      await refresh();
      setBlocking(null);
      toast.success('Статус учётной записи изменён');
    },
    onError,
  });

  const resetPageAnd =
    <T,>(setter: (value: T) => void) =>
    (value: T) => {
      setter(value);
      setPage(1);
    };

  return (
    <>
      <PageHeader title="Пользователи" />
      <Card className="mb-4 grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4">
        <TextField
          label="Поиск"
          type="search"
          placeholder="ФИО или email"
          value={searchInput}
          onChange={(event) => resetPageAnd(setSearchInput)(event.target.value)}
        />
        <SelectField
          label="Роль"
          value={role}
          onChange={(event) => resetPageAnd(setRole)(event.target.value)}
        >
          <option value="">Все роли</option>
          {ROLES.map((item) => (
            <option key={item} value={item}>
              {ROLE_LABELS[item]}
            </option>
          ))}
        </SelectField>
        <SelectField
          label="Состояние"
          value={blocked}
          onChange={(event) => resetPageAnd(setBlocked)(event.target.value)}
        >
          <option value="">Все</option>
          <option value="false">Активные</option>
          <option value="true">Заблокированные</option>
        </SelectField>
        <SelectField
          label="Сортировка"
          value={sort}
          onChange={(event) => resetPageAnd(setSort)(event.target.value)}
        >
          <option value="createdAt:desc">Сначала новые</option>
          <option value="fullName:asc">По ФИО</option>
          <option value="email:asc">По email</option>
        </SelectField>
      </Card>

      <Card>
        {users.isPending ? (
          <LoadingState />
        ) : users.isError ? (
          <ErrorState error={users.error} onRetry={() => void users.refetch()} />
        ) : users.data.data.length === 0 ? (
          <EmptyState title="Пользователи не найдены" description="Измените условия поиска." />
        ) : (
          <ul>
            {users.data.data.map((user) => (
              <li
                key={user.id}
                className="grid gap-2 border-t border-ink-100 p-4 first:border-t-0 md:grid-cols-[minmax(0,1fr)_220px_auto] md:items-center"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium text-ink-900">{user.fullName}</p>
                  <p className="truncate text-xs text-ink-500">
                    {user.email} · с {formatDateTime(user.createdAt)}
                  </p>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {user.roles.map((item) => (
                    <Badge key={item} className="bg-ink-100 text-ink-700">
                      {ROLE_LABELS[item]}
                    </Badge>
                  ))}
                  {user.isBlocked && (
                    <Badge className="bg-red-100 text-red-700">Заблокирован</Badge>
                  )}
                </div>
                <div className="flex flex-wrap gap-2 md:justify-end">
                  <Button variant="secondary" size="sm" onClick={() => setEditing(user)}>
                    Роли
                  </Button>
                  {user.id !== currentUser?.id && (
                    <Button
                      variant={user.isBlocked ? 'secondary' : 'ghost'}
                      size="sm"
                      className={user.isBlocked ? undefined : 'text-red-700'}
                      onClick={() => setBlocking(user)}
                    >
                      {user.isBlocked ? 'Разблокировать' : 'Заблокировать'}
                    </Button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
      {users.data?.meta && <Pagination meta={users.data.meta} onChange={setPage} />}

      {editing && (
        <RolesDialog
          user={editing}
          saving={saveRoles.isPending}
          onClose={() => setEditing(null)}
          onSave={(roles) => saveRoles.mutate(roles)}
        />
      )}
      {blocking && (
        <ConfirmDialog
          title={
            blocking.isBlocked ? 'Разблокировать пользователя?' : 'Заблокировать пользователя?'
          }
          message={
            blocking.isBlocked
              ? `${blocking.fullName} снова сможет входить в систему.`
              : `${blocking.fullName} не сможет войти, все сессии будут завершены.`
          }
          confirmLabel={blocking.isBlocked ? 'Разблокировать' : 'Заблокировать'}
          loading={toggleBlock.isPending}
          onCancel={() => setBlocking(null)}
          onConfirm={() => toggleBlock.mutate(blocking)}
        />
      )}
    </>
  );
}
