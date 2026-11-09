import type { PageMeta } from '@/api/types';
import { Button } from './Button';

interface PaginationProps {
  meta: PageMeta;
  onChange: (page: number) => void;
}

export function Pagination({ meta, onChange }: PaginationProps) {
  if (meta.totalPages <= 1) return null;
  return (
    <nav aria-label="Страницы" className="flex items-center justify-between gap-3 px-1 pt-4">
      <Button
        variant="secondary"
        size="sm"
        disabled={meta.page <= 1}
        onClick={() => onChange(meta.page - 1)}
      >
        Назад
      </Button>
      <span className="text-sm text-ink-600">
        Страница {meta.page} из {meta.totalPages} · всего {meta.total}
      </span>
      <Button
        variant="secondary"
        size="sm"
        disabled={meta.page >= meta.totalPages}
        onClick={() => onChange(meta.page + 1)}
      >
        Вперёд
      </Button>
    </nav>
  );
}
