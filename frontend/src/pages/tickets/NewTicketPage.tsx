import { useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { api } from '@/api/client';
import { ticketKeys } from '@/api/tickets';
import type { TicketDetails } from '@/api/types';
import { PageHeader } from '@/layout/AppShell';
import { Card, useToast } from '@/ui';
import { TicketForm, type TicketFormValues } from './TicketForm';

export function NewTicketPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const toast = useToast();

  const create = async (values: TicketFormValues) => {
    const ticket = await api.post<TicketDetails>('/tickets', values);
    await queryClient.invalidateQueries({ queryKey: ticketKeys.all });
    toast.success(`Заявка №${ticket.number} создана`);
    navigate(`/tickets/${ticket.id}`, { replace: true });
  };

  return (
    <>
      <PageHeader title="Новая заявка" description="Опишите проблему как можно подробнее." />
      <Card className="max-w-2xl p-5">
        <TicketForm
          submitLabel="Создать заявку"
          onSubmit={create}
          onCancel={() => navigate('/tickets')}
        />
      </Card>
    </>
  );
}
