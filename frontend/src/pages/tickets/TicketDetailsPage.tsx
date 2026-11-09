import type { ReactNode } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ApiError } from '@/api/client';
import { useTicket } from '@/api/tickets';
import { formatDateTime } from '@/lib/format';
import {
  Button,
  Card,
  EmptyState,
  ErrorState,
  LoadingState,
  OverdueBadge,
  PriorityLabel,
  StatusBadge,
} from '@/ui';
import { AttachmentsSection } from './AttachmentsSection';
import { CommentsSection } from './CommentsSection';
import { HistorySection } from './HistorySection';
import { SlaTimer } from './SlaTimer';
import { TicketActions } from './TicketActions';

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <dt className="text-xs text-ink-500">{label}</dt>
      <dd className="break-words text-sm text-ink-900">{children}</dd>
    </div>
  );
}

export function TicketDetailsPage() {
  const { id = '' } = useParams();
  const ticket = useTicket(id);

  if (ticket.isPending) return <LoadingState />;
  if (ticket.isError) {
    if (ticket.error instanceof ApiError && ticket.error.status === 404) {
      return (
        <EmptyState
          title="Заявка не найдена"
          description="Она удалена или у вас нет к ней доступа."
          action={
            <Link to="/tickets">
              <Button variant="secondary">К списку заявок</Button>
            </Link>
          }
        />
      );
    }
    return <ErrorState error={ticket.error} onRetry={() => void ticket.refetch()} />;
  }

  const data = ticket.data;
  const closed = data.status === 'CLOSED';

  return (
    <div className="flex flex-col gap-4">
      <div>
        <Link to="/tickets" className="text-sm text-brand-600 hover:underline">
          ← К списку заявок
        </Link>
        <h1 className="mt-2 break-words text-xl font-semibold text-ink-900 sm:text-2xl">
          <span className="text-ink-400">№{data.number}</span> {data.title}
        </h1>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <StatusBadge status={data.status} />
          <PriorityLabel priority={data.priority} />
          {data.isOverdue && <OverdueBadge />}
        </div>
      </div>

      <TicketActions ticket={data} />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="flex min-w-0 flex-col gap-4">
          <Card className="p-5">
            <h2 className="mb-2 font-semibold text-ink-900">Описание</h2>
            <p className="whitespace-pre-wrap break-words text-sm text-ink-800">
              {data.description}
            </p>
          </Card>
          <CommentsSection ticketId={data.id} closed={closed} />
        </div>
        <div className="flex min-w-0 flex-col gap-4">
          <Card className="p-5">
            <h2 className="mb-3 font-semibold text-ink-900">Сроки SLA</h2>
            <SlaTimer ticket={data} />
          </Card>
          <Card className="p-5">
            <dl className="flex flex-col gap-3">
              <Fact label="Автор">{data.author.fullName}</Fact>
              <Fact label="Исполнитель">{data.assignee?.fullName ?? 'Не назначен'}</Fact>
              <Fact label="Категория">{data.category.name}</Fact>
              <Fact label="Создана">{formatDateTime(data.createdAt)}</Fact>
            </dl>
          </Card>
          <AttachmentsSection ticketId={data.id} closed={closed} />
          <HistorySection ticketId={data.id} />
        </div>
      </div>
    </div>
  );
}
