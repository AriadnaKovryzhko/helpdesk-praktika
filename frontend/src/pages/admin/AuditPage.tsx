import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { api } from '@/api/client';
import type { AuditLog } from '@/api/types';
import { PageHeader } from '@/layout/AppShell';
import { formatDateTime } from '@/lib/format';
import { useDebouncedValue } from '@/lib/useDebouncedValue';
import {
  Card,
  EmptyState,
  ErrorState,
  LoadingState,
  Pagination,
  SelectField,
  TextField,
} from '@/ui';

const ACTION_LABELS: Record<string, string> = {
  LOGIN_SUCCESS: 'Вход в систему',
  LOGIN_FAILED: 'Неудачный вход',
  USER_REGISTERED: 'Регистрация',
  PASSWORD_RESET: 'Восстановление пароля',
  PASSWORD_CHANGED: 'Смена пароля',
  USER_ROLES_CHANGED: 'Изменение ролей',
  USER_BLOCKED: 'Блокировка',
  USER_UNBLOCKED: 'Разблокировка',
  TICKET_CREATED: 'Создание заявки',
  TICKET_UPDATED: 'Изменение заявки',
  TICKET_DELETED: 'Удаление заявки',
  TICKET_STATUS_CHANGED: 'Смена статуса',
  TICKET_ASSIGNED: 'Назначение исполнителя',
  COMMENT_DELETED: 'Удаление комментария',
  ATTACHMENT_ADDED: 'Загрузка вложения',
  ATTACHMENT_DELETED: 'Удаление вложения',
  CATEGORY_CREATED: 'Создание категории',
  CATEGORY_UPDATED: 'Изменение категории',
  CATEGORY_DELETED: 'Удаление категории',
  SLA_POLICY_CREATED: 'Создание SLA-политики',
  SLA_POLICY_UPDATED: 'Изменение SLA-политики',
  SLA_POLICY_DELETED: 'Удаление SLA-политики',
  SEED_COMPLETED: 'Начальные данные',
};

const toIso = (value: string, endOfDay: boolean): string | undefined =>
  value ? new Date(`${value}T${endOfDay ? '23:59:59' : '00:00:00'}`).toISOString() : undefined;

export function AuditPage() {
  const [searchInput, setSearchInput] = useState('');
  const search = useDebouncedValue(searchInput);
  const [action, setAction] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(1);

  const query = {
    page,
    pageSize: 20,
    search,
    action,
    dateFrom: toIso(dateFrom, false),
    dateTo: toIso(dateTo, true),
  };
  const logs = useQuery({
    queryKey: ['audit-logs', query],
    queryFn: () => api.page<AuditLog[]>('/audit-logs', query),
    placeholderData: keepPreviousData,
  });

  const withPageReset =
    (setter: (value: string) => void) => (event: { target: { value: string } }) => {
      setter(event.target.value);
      setPage(1);
    };

  return (
    <>
      <PageHeader title="Журнал аудита" />
      <Card className="mb-4 grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4">
        <TextField
          label="Поиск"
          type="search"
          placeholder="Сотрудник или объект"
          value={searchInput}
          onChange={withPageReset(setSearchInput)}
        />
        <SelectField label="Действие" value={action} onChange={withPageReset(setAction)}>
          <option value="">Все действия</option>
          {Object.entries(ACTION_LABELS).map(([code, label]) => (
            <option key={code} value={code}>
              {label}
            </option>
          ))}
        </SelectField>
        <TextField
          label="С даты"
          type="date"
          value={dateFrom}
          onChange={withPageReset(setDateFrom)}
        />
        <TextField label="По дату" type="date" value={dateTo} onChange={withPageReset(setDateTo)} />
      </Card>
      <Card>
        {logs.isPending ? (
          <LoadingState />
        ) : logs.isError ? (
          <ErrorState error={logs.error} onRetry={() => void logs.refetch()} />
        ) : logs.data.data.length === 0 ? (
          <EmptyState title="Записей не найдено" description="Измените условия поиска." />
        ) : (
          <ul>
            {logs.data.data.map((log) => (
              <li
                key={log.id}
                className="grid gap-1 border-t border-ink-100 p-4 first:border-t-0 md:grid-cols-[170px_minmax(0,1fr)_minmax(0,1fr)] md:gap-4"
              >
                <time className="text-xs text-ink-500" dateTime={log.createdAt}>
                  {formatDateTime(log.createdAt)}
                </time>
                <p className="text-sm font-medium text-ink-900">
                  {ACTION_LABELS[log.action] ?? log.action}
                </p>
                <p className="truncate text-sm text-ink-600">
                  {log.actor?.fullName ?? 'Система'}
                  {log.ip ? ` · ${log.ip}` : ''}
                </p>
              </li>
            ))}
          </ul>
        )}
      </Card>
      {logs.data?.meta && <Pagination meta={logs.data.meta} onChange={setPage} />}
    </>
  );
}
