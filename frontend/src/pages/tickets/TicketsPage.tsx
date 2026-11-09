import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAgents, useCategories, useTickets } from '@/api/tickets';
import type { Priority, Ticket, TicketStatus } from '@/api/types';
import { useAuth } from '@/auth/AuthContext';
import { PageHeader } from '@/layout/AppShell';
import { formatDateTime } from '@/lib/format';
import { PRIORITIES, PRIORITY_LABELS, STATUSES, STATUS_LABELS } from '@/lib/labels';
import { useDebouncedValue } from '@/lib/useDebouncedValue';
import {
  Button,
  Card,
  EmptyState,
  ErrorState,
  LoadingState,
  OverdueBadge,
  Pagination,
  PriorityLabel,
  SelectField,
  StatusBadge,
  TextField,
} from '@/ui';

const SORT_OPTIONS = [
  { value: 'createdAt:desc', label: 'Сначала новые' },
  { value: 'createdAt:asc', label: 'Сначала старые' },
  { value: 'resolutionDueAt:asc', label: 'Ближайший срок' },
  { value: 'priority:desc', label: 'Сначала важные' },
  { value: 'updatedAt:desc', label: 'Недавно изменённые' },
  { value: 'number:desc', label: 'По номеру' },
];

const PAGE_SIZE = 15;

function TicketRow({ ticket }: { ticket: Ticket }) {
  return (
    <li className="border-t border-ink-100 first:border-t-0">
      <Link
        to={`/tickets/${ticket.id}`}
        className="grid gap-x-4 gap-y-1.5 p-4 transition-colors hover:bg-ink-50 md:grid-cols-[minmax(0,1fr)_150px_110px_170px] md:items-center"
      >
        <div className="min-w-0">
          <p className="truncate font-medium text-ink-900">
            <span className="text-ink-400">№{ticket.number}</span> {ticket.title}
          </p>
          <p className="truncate text-xs text-ink-500">
            {ticket.category.name} · {ticket.author.fullName}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <StatusBadge status={ticket.status} />
          {ticket.isOverdue && <OverdueBadge />}
        </div>
        <PriorityLabel priority={ticket.priority} />
        <div className="text-xs text-ink-500">
          <p>{formatDateTime(ticket.createdAt)}</p>
          <p className="truncate">{ticket.assignee?.fullName ?? 'Исполнитель не назначен'}</p>
        </div>
      </Link>
    </li>
  );
}

export function TicketsPage() {
  const { hasRole } = useAuth();
  const isManager = hasRole('MANAGER');
  const isAgent = hasRole('AGENT');
  const [params, setParams] = useSearchParams();
  const [searchInput, setSearchInput] = useState(params.get('search') ?? '');
  const search = useDebouncedValue(searchInput);
  const categories = useCategories();
  const agents = useAgents(isManager);

  const sort = params.get('sort') ?? SORT_OPTIONS[0].value;
  const [sortBy, sortOrder] = sort.split(':');
  const scope = params.get('scope') ?? '';

  const update = (changes: Record<string, string>) => {
    setParams(
      (current) => {
        const next = new URLSearchParams(current);
        Object.entries(changes).forEach(([key, value]) => {
          if (value) next.set(key, value);
          else next.delete(key);
        });
        if (!('page' in changes)) next.delete('page');
        return next;
      },
      { replace: true },
    );
  };

  useEffect(() => {
    setParams(
      (current) => {
        if ((current.get('search') ?? '') === search) return current;
        const next = new URLSearchParams(current);
        if (search) next.set('search', search);
        else next.delete('search');
        next.delete('page');
        return next;
      },
      { replace: true },
    );
  }, [search, setParams]);

  const tickets = useTickets({
    page: Number(params.get('page') ?? 1),
    pageSize: PAGE_SIZE,
    search: params.get('search'),
    status: params.get('status') as TicketStatus | null,
    priority: params.get('priority') as Priority | null,
    categoryId: params.get('categoryId'),
    assigneeId: params.get('assigneeId'),
    overdue: params.get('overdue') === 'true' ? true : undefined,
    assignedToMe: scope === 'assigned' ? true : undefined,
    createdByMe: scope === 'created' ? true : undefined,
    sortBy,
    sortOrder,
  });

  const hasFilters = [
    'search',
    'status',
    'priority',
    'categoryId',
    'assigneeId',
    'overdue',
    'scope',
  ].some((key) => params.get(key));

  return (
    <>
      <PageHeader
        title="Заявки"
        actions={
          <Link to="/tickets/new">
            <Button>Создать заявку</Button>
          </Link>
        }
      />
      <Card className="mb-4 grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4">
        <TextField
          label="Поиск"
          type="search"
          placeholder="Номер, тема или описание"
          value={searchInput}
          onChange={(event) => setSearchInput(event.target.value)}
        />
        <SelectField
          label="Статус"
          value={params.get('status') ?? ''}
          onChange={(event) => update({ status: event.target.value })}
        >
          <option value="">Все статусы</option>
          {STATUSES.map((status) => (
            <option key={status} value={status}>
              {STATUS_LABELS[status]}
            </option>
          ))}
        </SelectField>
        <SelectField
          label="Приоритет"
          value={params.get('priority') ?? ''}
          onChange={(event) => update({ priority: event.target.value })}
        >
          <option value="">Все приоритеты</option>
          {PRIORITIES.map((priority) => (
            <option key={priority} value={priority}>
              {PRIORITY_LABELS[priority]}
            </option>
          ))}
        </SelectField>
        <SelectField
          label="Категория"
          value={params.get('categoryId') ?? ''}
          onChange={(event) => update({ categoryId: event.target.value })}
        >
          <option value="">Все категории</option>
          {categories.data?.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </SelectField>
        {(isAgent || isManager) && (
          <SelectField
            label="Показать"
            value={scope}
            onChange={(event) => update({ scope: event.target.value })}
          >
            <option value="">Все доступные</option>
            <option value="assigned">Назначенные на меня</option>
            <option value="created">Созданные мной</option>
          </SelectField>
        )}
        {isManager && (
          <SelectField
            label="Исполнитель"
            value={params.get('assigneeId') ?? ''}
            onChange={(event) => update({ assigneeId: event.target.value })}
          >
            <option value="">Все исполнители</option>
            {agents.data?.map((agent) => (
              <option key={agent.id} value={agent.id}>
                {agent.fullName}
              </option>
            ))}
          </SelectField>
        )}
        <SelectField
          label="Сортировка"
          value={sort}
          onChange={(event) => update({ sort: event.target.value })}
        >
          {SORT_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </SelectField>
        <label className="flex items-center gap-2 self-end pb-2.5 text-sm text-ink-700">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-ink-300"
            checked={params.get('overdue') === 'true'}
            onChange={(event) => update({ overdue: event.target.checked ? 'true' : '' })}
          />
          Только просроченные
        </label>
      </Card>

      <Card>
        {tickets.isPending ? (
          <LoadingState />
        ) : tickets.isError ? (
          <ErrorState error={tickets.error} onRetry={() => void tickets.refetch()} />
        ) : tickets.data.data.length === 0 ? (
          <EmptyState
            title={hasFilters ? 'Ничего не найдено' : 'Заявок пока нет'}
            description={
              hasFilters ? 'Измените условия поиска.' : 'Создайте первую заявку в поддержку.'
            }
          />
        ) : (
          <ul>
            {tickets.data.data.map((ticket) => (
              <TicketRow key={ticket.id} ticket={ticket} />
            ))}
          </ul>
        )}
      </Card>
      {tickets.data?.meta && (
        <Pagination meta={tickets.data.meta} onChange={(page) => update({ page: String(page) })} />
      )}
    </>
  );
}
