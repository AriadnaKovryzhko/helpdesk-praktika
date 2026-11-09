import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/api/client';
import type { AppNotification } from '@/api/types';
import { PageHeader } from '@/layout/AppShell';
import { cn } from '@/lib/cn';
import { formatDateTime } from '@/lib/format';
import { NOTIFICATION_LABELS } from '@/lib/labels';
import { notificationKeys, useNotifications } from '@/realtime/notifications';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorState,
  LoadingState,
  Pagination,
  useToast,
} from '@/ui';

export function NotificationsPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const toast = useToast();
  const [page, setPage] = useState(1);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const notifications = useNotifications(page, unreadOnly);
  const refresh = () => queryClient.invalidateQueries({ queryKey: notificationKeys.all });

  const markAll = useMutation({
    mutationFn: () => api.post('/notifications/read-all'),
    onSuccess: refresh,
    onError: (error: Error) => toast.error(error.message),
  });

  const open = async (notification: AppNotification) => {
    if (!notification.readAt) {
      await api.post(`/notifications/${notification.id}/read`).catch(() => undefined);
      await refresh();
    }
    if (notification.ticketId) navigate(`/tickets/${notification.ticketId}`);
  };

  return (
    <>
      <PageHeader
        title="Уведомления"
        actions={
          <>
            <Button
              variant="secondary"
              onClick={() => {
                setUnreadOnly((value) => !value);
                setPage(1);
              }}
            >
              {unreadOnly ? 'Показать все' : 'Только непрочитанные'}
            </Button>
            <Button
              variant="secondary"
              loading={markAll.isPending}
              onClick={() => markAll.mutate()}
            >
              Прочитать все
            </Button>
          </>
        }
      />
      <Card>
        {notifications.isPending ? (
          <LoadingState />
        ) : notifications.isError ? (
          <ErrorState error={notifications.error} onRetry={() => void notifications.refetch()} />
        ) : notifications.data.data.length === 0 ? (
          <EmptyState title="Уведомлений нет" />
        ) : (
          <ul>
            {notifications.data.data.map((notification) => (
              <li key={notification.id} className="border-t border-ink-100 first:border-t-0">
                <button
                  className={cn(
                    'flex w-full flex-wrap items-start justify-between gap-2 p-4 text-left hover:bg-ink-50',
                    !notification.readAt && 'bg-brand-50/60',
                  )}
                  onClick={() => void open(notification)}
                >
                  <span className="min-w-0 flex-1">
                    <span className="block font-medium text-ink-900">{notification.title}</span>
                    <span className="block break-words text-sm text-ink-600">
                      {notification.body}
                    </span>
                  </span>
                  <span className="flex items-center gap-3">
                    <Badge className="bg-ink-100 text-ink-700">
                      {NOTIFICATION_LABELS[notification.type]}
                    </Badge>
                    <span className="text-xs text-ink-500">
                      {formatDateTime(notification.createdAt)}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </Card>
      {notifications.data?.meta && <Pagination meta={notifications.data.meta} onChange={setPage} />}
    </>
  );
}
