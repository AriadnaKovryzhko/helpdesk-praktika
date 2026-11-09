import type { ReactNode } from 'react';
import { Button } from './Button';
import { Spinner } from './Spinner';

export function LoadingState({ label = 'Загрузка…' }: { label?: string }) {
  return (
    <div role="status" className="flex items-center justify-center gap-3 py-16 text-ink-500">
      <Spinner />
      <span className="text-sm">{label}</span>
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-2 px-4 py-16 text-center">
      <p className="font-medium text-ink-800">{title}</p>
      {description && <p className="max-w-md text-sm text-ink-500">{description}</p>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}

export function ErrorState({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  return (
    <div role="alert" className="flex flex-col items-center gap-2 px-4 py-16 text-center">
      <p className="font-medium text-ink-800">Не удалось загрузить данные</p>
      <p className="max-w-md text-sm text-ink-500">
        {error instanceof Error ? error.message : 'Попробуйте ещё раз'}
      </p>
      {onRetry && (
        <Button variant="secondary" className="mt-3" onClick={onRetry}>
          Повторить
        </Button>
      )}
    </div>
  );
}

export function FormError({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
      {message}
    </p>
  );
}
