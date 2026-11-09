import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/api/client';
import { ticketKeys, useAgents } from '@/api/tickets';
import type { TicketDetails, TicketStatus } from '@/api/types';
import { TRANSITION_LABELS } from '@/lib/labels';
import { Button, ConfirmDialog, Modal, SelectField, useToast } from '@/ui';
import { TicketForm, type TicketFormValues } from './TicketForm';

export function TicketActions({ ticket }: { ticket: TicketDetails }) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const toast = useToast();
  const agents = useAgents(ticket.canAssign);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [assigneeId, setAssigneeId] = useState('');

  const refresh = (updated: TicketDetails) => {
    queryClient.setQueryData(ticketKeys.details(ticket.id), updated);
    return queryClient.invalidateQueries({ queryKey: ticketKeys.all });
  };

  const run = async (name: string, action: () => Promise<TicketDetails>, message: string) => {
    setBusyAction(name);
    try {
      await refresh(await action());
      toast.success(message);
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setBusyAction(null);
    }
  };

  const changeStatus = (status: TicketStatus) =>
    void run(
      status,
      () => api.post<TicketDetails>(`/tickets/${ticket.id}/status`, { status }),
      'Статус изменён',
    );

  const take = () =>
    void run(
      'take',
      () => api.post<TicketDetails>(`/tickets/${ticket.id}/assign`, {}),
      'Заявка назначена на вас',
    );

  const assign = () =>
    void run(
      'assign',
      () => api.post<TicketDetails>(`/tickets/${ticket.id}/assign`, { assigneeId }),
      'Исполнитель назначен',
    ).then(() => setAssigneeId(''));

  const save = async (values: TicketFormValues) => {
    await refresh(await api.patch<TicketDetails>(`/tickets/${ticket.id}`, values));
    setEditing(false);
    toast.success('Заявка сохранена');
  };

  const remove = async () => {
    setBusyAction('delete');
    try {
      await api.delete(`/tickets/${ticket.id}`);
      await queryClient.invalidateQueries({ queryKey: ticketKeys.all });
      toast.success('Заявка удалена');
      navigate('/tickets', { replace: true });
    } catch (error) {
      toast.error((error as Error).message);
      setBusyAction(null);
      setConfirmingDelete(false);
    }
  };

  const hasActions =
    ticket.canTake ||
    ticket.canAssign ||
    ticket.canEdit ||
    ticket.canDelete ||
    ticket.allowedTransitions.length > 0;
  if (!hasActions) return null;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        {ticket.canTake && (
          <Button loading={busyAction === 'take'} onClick={take}>
            Взять в работу
          </Button>
        )}
        {ticket.allowedTransitions.map((status) => (
          <Button
            key={status}
            variant={status === 'RESOLVED' || status === 'CLOSED' ? 'primary' : 'secondary'}
            loading={busyAction === status}
            onClick={() => changeStatus(status)}
          >
            {ticket.status === 'RESOLVED' && status === 'IN_PROGRESS'
              ? 'Переоткрыть'
              : TRANSITION_LABELS[status]}
          </Button>
        ))}
        {ticket.canEdit && (
          <Button variant="secondary" onClick={() => setEditing(true)}>
            Изменить
          </Button>
        )}
        {ticket.canDelete && (
          <Button
            variant="ghost"
            className="text-red-700"
            onClick={() => setConfirmingDelete(true)}
          >
            Удалить
          </Button>
        )}
      </div>

      {ticket.canAssign && (
        <div className="flex flex-col gap-2 sm:max-w-md sm:flex-row sm:items-end">
          <div className="flex-1">
            <SelectField
              label={ticket.assignee ? 'Сменить исполнителя' : 'Назначить исполнителя'}
              value={assigneeId}
              onChange={(event) => setAssigneeId(event.target.value)}
            >
              <option value="">Выберите исполнителя</option>
              {agents.data
                ?.filter((agent) => agent.id !== ticket.assignee?.id)
                .map((agent) => (
                  <option key={agent.id} value={agent.id}>
                    {agent.fullName}
                  </option>
                ))}
            </SelectField>
          </div>
          <Button disabled={!assigneeId} loading={busyAction === 'assign'} onClick={assign}>
            Назначить
          </Button>
        </div>
      )}

      {editing && (
        <Modal title={`Изменение заявки №${ticket.number}`} onClose={() => setEditing(false)}>
          <TicketForm
            initial={{
              title: ticket.title,
              description: ticket.description,
              categoryId: ticket.category.id,
              priority: ticket.priority,
            }}
            submitLabel="Сохранить"
            onSubmit={save}
            onCancel={() => setEditing(false)}
          />
        </Modal>
      )}
      {confirmingDelete && (
        <ConfirmDialog
          title={`Удалить заявку №${ticket.number}?`}
          message="Заявка, её комментарии и вложения будут удалены без возможности восстановления."
          loading={busyAction === 'delete'}
          onCancel={() => setConfirmingDelete(false)}
          onConfirm={() => void remove()}
        />
      )}
    </div>
  );
}
