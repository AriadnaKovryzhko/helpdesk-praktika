import { Link } from 'react-router-dom';
import { useUnreadCount } from './notifications';

export function NotificationBell() {
  const unread = useUnreadCount();
  const count = unread.data?.count ?? 0;
  return (
    <Link
      to="/notifications"
      aria-label={count > 0 ? `Уведомления, непрочитанных: ${count}` : 'Уведомления'}
      className="relative rounded-lg border border-ink-200 px-3 py-1.5 text-sm text-ink-700 hover:bg-ink-50"
    >
      Уведомления
      {count > 0 && (
        <span
          data-testid="unread-count"
          className="absolute -right-2 -top-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-xs font-semibold text-white"
        >
          {count > 99 ? '99+' : count}
        </span>
      )}
    </Link>
  );
}
