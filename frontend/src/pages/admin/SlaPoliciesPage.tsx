import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import { api } from '@/api/client';
import { useSlaPolicies } from '@/api/tickets';
import type { Priority, SlaPolicy } from '@/api/types';
import { PageHeader } from '@/layout/AppShell';
import { formatMinutes } from '@/lib/format';
import { PRIORITIES, PRIORITY_LABELS } from '@/lib/labels';
import { useFormErrors } from '@/lib/useFormErrors';
import {
  Button,
  Card,
  ConfirmDialog,
  EmptyState,
  ErrorState,
  FormError,
  LoadingState,
  Modal,
  SelectField,
  TextField,
  useToast,
} from '@/ui';

function PolicyDialog({
  policy,
  freePriorities,
  onClose,
  onSaved,
}: {
  policy: SlaPolicy | null;
  freePriorities: Priority[];
  onClose: () => void;
  onSaved: () => Promise<unknown>;
}) {
  const toast = useToast();
  const [priority, setPriority] = useState<Priority>(policy?.priority ?? freePriorities[0]);
  const [reaction, setReaction] = useState(String(policy?.reactionMinutes ?? ''));
  const [resolution, setResolution] = useState(String(policy?.resolutionMinutes ?? ''));
  const [saving, setSaving] = useState(false);
  const { errors, formError, showClientErrors, showServerError } = useFormErrors();

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const reactionMinutes = Number(reaction);
    const resolutionMinutes = Number(resolution);
    const invalid = (value: number) => !Number.isInteger(value) || value < 1;
    const valid = showClientErrors({
      reactionMinutes: invalid(reactionMinutes) ? 'Укажите целое число минут' : undefined,
      resolutionMinutes: invalid(resolutionMinutes)
        ? 'Укажите целое число минут'
        : reactionMinutes > resolutionMinutes
          ? 'Срок решения не может быть меньше срока реакции'
          : undefined,
    });
    if (!valid) return;
    setSaving(true);
    try {
      if (policy) {
        await api.patch(`/sla-policies/${policy.id}`, { reactionMinutes, resolutionMinutes });
      } else {
        await api.post('/sla-policies', { priority, reactionMinutes, resolutionMinutes });
      }
      await onSaved();
      toast.success('Политика сохранена');
      onClose();
    } catch (error) {
      showServerError(error);
      setSaving(false);
    }
  };

  return (
    <Modal
      title={policy ? `Политика: ${PRIORITY_LABELS[policy.priority]}` : 'Новая политика'}
      onClose={onClose}
    >
      <form noValidate onSubmit={(event) => void submit(event)} className="flex flex-col gap-4">
        <FormError message={formError} />
        {!policy && (
          <SelectField
            label="Приоритет"
            value={priority}
            onChange={(event) => setPriority(event.target.value as Priority)}
          >
            {freePriorities.map((item) => (
              <option key={item} value={item}>
                {PRIORITY_LABELS[item]}
              </option>
            ))}
          </SelectField>
        )}
        <TextField
          label="Реакция, минут"
          type="number"
          min={1}
          value={reaction}
          error={errors.reactionMinutes}
          onChange={(event) => setReaction(event.target.value)}
        />
        <TextField
          label="Решение, минут"
          type="number"
          min={1}
          value={resolution}
          error={errors.resolutionMinutes}
          onChange={(event) => setResolution(event.target.value)}
        />
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            Отмена
          </Button>
          <Button type="submit" loading={saving}>
            Сохранить
          </Button>
        </div>
      </form>
    </Modal>
  );
}

export function SlaPoliciesPage() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const policies = useSlaPolicies();
  const [editing, setEditing] = useState<SlaPolicy | 'new' | null>(null);
  const [removing, setRemoving] = useState<SlaPolicy | null>(null);
  const refresh = () => queryClient.invalidateQueries({ queryKey: ['sla-policies'] });

  const remove = useMutation({
    mutationFn: (policy: SlaPolicy) => api.delete(`/sla-policies/${policy.id}`),
    onSuccess: async () => {
      await refresh();
      setRemoving(null);
      toast.success('Политика удалена');
    },
    onError: (error: Error) => {
      toast.error(error.message);
      setRemoving(null);
    },
  });

  const used = new Set(policies.data?.map((policy) => policy.priority));
  const freePriorities = PRIORITIES.filter((priority) => !used.has(priority));

  return (
    <>
      <PageHeader
        title="SLA-политики"
        description="Сроки применяются к новым заявкам."
        actions={
          freePriorities.length > 0 ? (
            <Button onClick={() => setEditing('new')}>Добавить</Button>
          ) : undefined
        }
      />
      <Card>
        {policies.isPending ? (
          <LoadingState />
        ) : policies.isError ? (
          <ErrorState error={policies.error} onRetry={() => void policies.refetch()} />
        ) : policies.data.length === 0 ? (
          <EmptyState title="Политик пока нет" />
        ) : (
          <ul>
            {policies.data.map((policy) => (
              <li
                key={policy.id}
                className="flex flex-wrap items-center justify-between gap-3 border-t border-ink-100 p-4 first:border-t-0"
              >
                <div>
                  <p className="font-medium text-ink-900">{PRIORITY_LABELS[policy.priority]}</p>
                  <p className="text-xs text-ink-500">
                    Реакция: {formatMinutes(policy.reactionMinutes)} · Решение:{' '}
                    {formatMinutes(policy.resolutionMinutes)}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button variant="secondary" size="sm" onClick={() => setEditing(policy)}>
                    Изменить
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-red-700"
                    onClick={() => setRemoving(policy)}
                  >
                    Удалить
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
      {editing && (
        <PolicyDialog
          policy={editing === 'new' ? null : editing}
          freePriorities={freePriorities}
          onClose={() => setEditing(null)}
          onSaved={refresh}
        />
      )}
      {removing && (
        <ConfirmDialog
          title="Удалить политику?"
          message="Политику, которая используется в заявках, удалить нельзя."
          loading={remove.isPending}
          onCancel={() => setRemoving(null)}
          onConfirm={() => remove.mutate(removing)}
        />
      )}
    </>
  );
}
