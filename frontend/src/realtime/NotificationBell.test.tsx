import { screen } from '@testing-library/react';
import { mockApi, renderWithProviders } from '@/test/utils';
import { NotificationBell } from './NotificationBell';

describe('NotificationBell', () => {
  it('показывает количество непрочитанных', async () => {
    mockApi({ 'GET /api/notifications/unread-count': { count: 3 } });
    renderWithProviders(<NotificationBell />);
    expect(await screen.findByTestId('unread-count')).toHaveTextContent('3');
  });

  it('скрывает счётчик без непрочитанных', async () => {
    mockApi({ 'GET /api/notifications/unread-count': { count: 0 } });
    renderWithProviders(<NotificationBell />);
    expect(await screen.findByRole('link', { name: 'Уведомления' })).toBeInTheDocument();
    expect(screen.queryByTestId('unread-count')).not.toBeInTheDocument();
  });
});
