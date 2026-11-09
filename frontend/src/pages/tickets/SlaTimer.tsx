import type { Ticket } from '@/api/types';
import { cn } from '@/lib/cn';
import { formatDateTime, formatDuration } from '@/lib/format';
import { useCountdown } from '@/lib/useCountdown';

const WARNING_MS = 60 * 60 * 1000;

function Timer({ label, deadline }: { label: string; deadline: string }) {
  const remaining = useCountdown(deadline) ?? 0;
  const overdue = remaining < 0;
  return (
    <div>
      <p className="text-xs text-ink-500">{label}</p>
      <p
        role="timer"
        className={cn(
          'font-mono text-lg font-semibold tabular-nums',
          overdue ? 'text-red-700' : remaining < WARNING_MS ? 'text-amber-700' : 'text-ink-900',
        )}
      >
        {overdue ? `Просрочено на ${formatDuration(remaining)}` : formatDuration(remaining)}
      </p>
      <p className="text-xs text-ink-500">Срок: {formatDateTime(deadline)}</p>
    </div>
  );
}

function Finished({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-ink-500">{label}</p>
      <p className="text-sm font-medium text-ink-900">{value}</p>
    </div>
  );
}

export function SlaTimer({ ticket }: { ticket: Ticket }) {
  const finishedAt = ticket.closedAt ?? ticket.resolvedAt;
  return (
    <div className="flex flex-col gap-3">
      {ticket.status === 'NEW' ? (
        <Timer label="До реакции" deadline={ticket.reactionDueAt} />
      ) : (
        ticket.reactedAt && <Finished label="Реакция" value={formatDateTime(ticket.reactedAt)} />
      )}
      {finishedAt ? (
        <Finished
          label={ticket.resolutionBreachedAt ? 'Решена с просрочкой' : 'Решена в срок'}
          value={formatDateTime(finishedAt)}
        />
      ) : (
        <Timer label="До решения" deadline={ticket.resolutionDueAt} />
      )}
    </div>
  );
}
