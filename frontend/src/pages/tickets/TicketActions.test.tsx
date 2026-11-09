import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { makeTicket, mockApi, renderWithProviders } from '@/test/utils';
import { TicketActions } from './TicketActions';

describe('TicketActions', () => {
  it('показывает только разрешённые сервером переходы', () => {
    mockApi({});
    renderWithProviders(
      <TicketActions ticket={makeTicket({ allowedTransitions: ['WAITING_USER', 'RESOLVED'] })} />,
    );
    expect(screen.getByRole('button', { name: 'Запросить ответ' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Отметить решённой' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Закрыть' })).not.toBeInTheDocument();
  });

  it('ничего не показывает без доступных действий', () => {
    mockApi({});
    renderWithProviders(<TicketActions ticket={makeTicket()} />);
    expect(screen.queryAllByRole('button')).toHaveLength(0);
  });

  it('отправляет новый статус', async () => {
    const ticket = makeTicket({ allowedTransitions: ['RESOLVED'] });
    const fetchMock = mockApi({
      'POST /api/tickets/t1/status': makeTicket({ status: 'RESOLVED' }),
    });
    renderWithProviders(<TicketActions ticket={ticket} />);
    await userEvent.click(screen.getByRole('button', { name: 'Отметить решённой' }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(fetchMock.mock.calls[0][1]?.body).toBe(JSON.stringify({ status: 'RESOLVED' }));
    expect(await screen.findByText('Статус изменён')).toBeInTheDocument();
  });

  it('берёт заявку в работу', async () => {
    const fetchMock = mockApi({
      'POST /api/tickets/t1/assign': makeTicket({ status: 'ASSIGNED' }),
    });
    renderWithProviders(
      <TicketActions ticket={makeTicket({ status: 'NEW', assignee: null, canTake: true })} />,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Взять в работу' }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(await screen.findByText('Заявка назначена на вас')).toBeInTheDocument();
  });

  it('требует подтверждение удаления', async () => {
    const fetchMock = mockApi({});
    renderWithProviders(<TicketActions ticket={makeTicket({ canDelete: true })} />);
    await userEvent.click(screen.getByRole('button', { name: 'Удалить' }));
    expect(screen.getByRole('dialog')).toHaveTextContent('Удалить заявку №12?');
    expect(fetchMock).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button', { name: 'Отмена' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('показывает ошибку сервера', async () => {
    mockApi({});
    renderWithProviders(
      <TicketActions ticket={makeTicket({ allowedTransitions: ['RESOLVED'] })} />,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Отметить решённой' }));
    expect(await screen.findByText('POST /api/tickets/t1/status')).toBeInTheDocument();
  });
});
