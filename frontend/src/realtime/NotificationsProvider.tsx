import { useQueryClient } from '@tanstack/react-query';
import { useEffect, type ReactNode } from 'react';
import { io } from 'socket.io-client';
import { getAccessToken, refreshSession } from '@/api/client';
import { ticketKeys } from '@/api/tickets';
import type { AppNotification } from '@/api/types';
import { useAuth } from '@/auth/AuthContext';
import { useToast } from '@/ui';
import { notificationKeys } from './notifications';

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const { status } = useAuth();
  const queryClient = useQueryClient();
  const toast = useToast();

  useEffect(() => {
    if (status !== 'authenticated') return undefined;

    const socket = io({
      path: '/socket.io',
      auth: (send) => send({ token: getAccessToken() }),
    });

    socket.on('connect_error', () => {
      refreshSession().catch(() => socket.disconnect());
    });

    socket.on('notification', (notification: AppNotification) => {
      toast.info(notification.title);
      void queryClient.invalidateQueries({ queryKey: notificationKeys.all });
      void queryClient.invalidateQueries({ queryKey: ticketKeys.all });
      void queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    });

    return () => {
      socket.disconnect();
    };
  }, [status, queryClient, toast]);

  return <>{children}</>;
}
