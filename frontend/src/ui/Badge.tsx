import type { ReactNode } from 'react';
import type { Priority, TicketStatus } from '@/api/types';
import { cn } from '@/lib/cn';
import { PRIORITY_LABELS, STATUS_LABELS } from '@/lib/labels';

const STATUS_STYLES: Record<TicketStatus, string> = {
  NEW: 'bg-sky-100 text-sky-800',
  ASSIGNED: 'bg-indigo-100 text-indigo-800',
  IN_PROGRESS: 'bg-amber-100 text-amber-900',
  WAITING_USER: 'bg-purple-100 text-purple-800',
  RESOLVED: 'bg-emerald-100 text-emerald-800',
  CLOSED: 'bg-ink-200 text-ink-700',
};

const PRIORITY_STYLES: Record<Priority, string> = {
  LOW: 'text-ink-600',
  MEDIUM: 'text-sky-700',
  HIGH: 'text-orange-700',
  CRITICAL: 'text-red-700',
};

export function Badge({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <span
      className={cn(
        'inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium',
        className,
      )}
    >
      {children}
    </span>
  );
}

export function StatusBadge({ status }: { status: TicketStatus }) {
  return <Badge className={STATUS_STYLES[status]}>{STATUS_LABELS[status]}</Badge>;
}

export function PriorityLabel({ priority }: { priority: Priority }) {
  return (
    <span className={cn('whitespace-nowrap text-xs font-semibold', PRIORITY_STYLES[priority])}>
      {PRIORITY_LABELS[priority]}
    </span>
  );
}

export function OverdueBadge() {
  return <Badge className="bg-red-100 text-red-700">Просрочена</Badge>;
}
