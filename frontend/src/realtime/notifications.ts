import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { api } from '@/api/client';
import type { AppNotification } from '@/api/types';

export const notificationKeys = {
  all: ['notifications'] as const,
  unread: ['notifications', 'unread'] as const,
  list: (page: number, unreadOnly: boolean) => ['notifications', 'list', page, unreadOnly] as const,
};

export const useUnreadCount = () =>
  useQuery({
    queryKey: notificationKeys.unread,
    queryFn: () => api.get<{ count: number }>('/notifications/unread-count'),
  });

export const useNotifications = (page: number, unreadOnly: boolean) =>
  useQuery({
    queryKey: notificationKeys.list(page, unreadOnly),
    queryFn: () =>
      api.page<AppNotification[]>('/notifications', { page, pageSize: 20, unreadOnly }),
    placeholderData: keepPreviousData,
  });
