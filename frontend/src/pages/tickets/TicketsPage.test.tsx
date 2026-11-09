import { screen } from '@testing-library/react';
import type { Role } from '@/api/types';
import { mockApi, renderWithProviders } from '@/test/utils';
import { TicketsPage } from './TicketsPage';

function renderAs(roles: Role[]) {
  mockApi({
    'GET /api/tickets': [],
    'GET /api/categories': [],
    'GET /api/users/agents': [],
  });
  renderWithProviders(<TicketsPage />, { roles, route: '/tickets' });
}

describe('TicketsPage', () => {
  it('показывает создание заявки пользователю', async () => {
    renderAs(['USER']);
    expect(await screen.findByText('Заявок пока нет')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Создать заявку' })).toBeInTheDocument();
  });

  it.each([['AGENT'], ['MANAGER']] as [Role][])(
    'скрывает создание заявки от роли %s',
    async (role) => {
      renderAs([role]);
      expect(await screen.findByText('Новые заявки появятся здесь.')).toBeInTheDocument();
      expect(screen.queryByRole('link', { name: 'Создать заявку' })).not.toBeInTheDocument();
    },
  );
});
