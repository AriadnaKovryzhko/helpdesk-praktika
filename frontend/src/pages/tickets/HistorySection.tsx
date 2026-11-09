import { useHistory } from '@/api/tickets';
import { formatDateTime } from '@/lib/format';
import { STATUS_LABELS } from '@/lib/labels';
import { Card, ErrorState, LoadingState } from '@/ui';

export function HistorySection({ ticketId }: { ticketId: string }) {
  const history = useHistory(ticketId);
  return (
    <Card className="p-5">
      <h2 className="mb-3 font-semibold text-ink-900">История статусов</h2>
      {history.isPending ? (
        <LoadingState />
      ) : history.isError ? (
        <ErrorState error={history.error} onRetry={() => void history.refetch()} />
      ) : (
        <ol className="flex flex-col gap-3 border-l-2 border-ink-100 pl-4">
          {history.data.map((entry) => (
            <li key={entry.id} className="text-sm">
              <p className="font-medium text-ink-800">
                {entry.fromStatus
                  ? `${STATUS_LABELS[entry.fromStatus]} → ${STATUS_LABELS[entry.toStatus]}`
                  : STATUS_LABELS[entry.toStatus]}
              </p>
              <p className="text-xs text-ink-500">
                {entry.changedBy.fullName} · {formatDateTime(entry.createdAt)}
              </p>
              {entry.comment && (
                <p className="mt-1 whitespace-pre-wrap break-words text-xs text-ink-700">
                  {entry.comment}
                </p>
              )}
            </li>
          ))}
        </ol>
      )}
    </Card>
  );
}
