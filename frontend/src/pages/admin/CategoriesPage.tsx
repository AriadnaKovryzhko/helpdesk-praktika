import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import { api } from '@/api/client';
import { useCategories } from '@/api/tickets';
import type { Category } from '@/api/types';
import { PageHeader } from '@/layout/AppShell';
import { useFormErrors } from '@/lib/useFormErrors';
import {
  Badge,
  Button,
  Card,
  ConfirmDialog,
  EmptyState,
  ErrorState,
  FormError,
  LoadingState,
  Modal,
  TextField,
  useToast,
} from '@/ui';

function CategoryDialog({
  category,
  onClose,
  onSaved,
}: {
  category: Category | null;
  onClose: () => void;
  onSaved: () => Promise<unknown>;
}) {
  const toast = useToast();
  const [name, setName] = useState(category?.name ?? '');
  const [description, setDescription] = useState(category?.description ?? '');
  const [isActive, setIsActive] = useState(category?.isActive ?? true);
  const [saving, setSaving] = useState(false);
  const { errors, formError, showClientErrors, showServerError } = useFormErrors();

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const trimmed = name.trim();
    const valid = showClientErrors({
      name: trimmed.length < 2 || trimmed.length > 80 ? 'Название: от 2 до 80 символов' : undefined,
    });
    if (!valid) return;
    setSaving(true);
    const body = { name: trimmed, description: description.trim() || null, isActive };
    try {
      if (category) await api.patch(`/categories/${category.id}`, body);
      else await api.post('/categories', body);
      await onSaved();
      toast.success('Категория сохранена');
      onClose();
    } catch (error) {
      showServerError(error);
      setSaving(false);
    }
  };

  return (
    <Modal title={category ? 'Изменение категории' : 'Новая категория'} onClose={onClose}>
      <form noValidate onSubmit={(event) => void submit(event)} className="flex flex-col gap-4">
        <FormError message={formError} />
        <TextField
          label="Название"
          value={name}
          error={errors.name}
          onChange={(event) => setName(event.target.value)}
        />
        <TextField
          label="Описание"
          value={description}
          error={errors.description}
          onChange={(event) => setDescription(event.target.value)}
        />
        <label className="flex items-center gap-2 text-sm text-ink-800">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-ink-300"
            checked={isActive}
            onChange={(event) => setIsActive(event.target.checked)}
          />
          Доступна при создании заявок
        </label>
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

export function CategoriesPage() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const categories = useCategories(true);
  const [editing, setEditing] = useState<Category | 'new' | null>(null);
  const [removing, setRemoving] = useState<Category | null>(null);
  const refresh = () => queryClient.invalidateQueries({ queryKey: ['categories'] });

  const remove = useMutation({
    mutationFn: (category: Category) => api.delete(`/categories/${category.id}`),
    onSuccess: async () => {
      await refresh();
      setRemoving(null);
      toast.success('Категория удалена');
    },
    onError: (error: Error) => {
      toast.error(error.message);
      setRemoving(null);
    },
  });

  return (
    <>
      <PageHeader
        title="Категории"
        actions={<Button onClick={() => setEditing('new')}>Добавить</Button>}
      />
      <Card>
        {categories.isPending ? (
          <LoadingState />
        ) : categories.isError ? (
          <ErrorState error={categories.error} onRetry={() => void categories.refetch()} />
        ) : categories.data.length === 0 ? (
          <EmptyState title="Категорий пока нет" />
        ) : (
          <ul>
            {categories.data.map((category) => (
              <li
                key={category.id}
                className="flex flex-wrap items-center justify-between gap-3 border-t border-ink-100 p-4 first:border-t-0"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-ink-900">
                    {category.name}{' '}
                    {!category.isActive && (
                      <Badge className="ml-1 bg-ink-100 text-ink-600">Отключена</Badge>
                    )}
                  </p>
                  {category.description && (
                    <p className="text-xs text-ink-500">{category.description}</p>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button variant="secondary" size="sm" onClick={() => setEditing(category)}>
                    Изменить
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-red-700"
                    onClick={() => setRemoving(category)}
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
        <CategoryDialog
          category={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={refresh}
        />
      )}
      {removing && (
        <ConfirmDialog
          title="Удалить категорию?"
          message={`Категория «${removing.name}» будет удалена. Категорию с заявками удалить нельзя.`}
          loading={remove.isPending}
          onCancel={() => setRemoving(null)}
          onConfirm={() => remove.mutate(removing)}
        />
      )}
    </>
  );
}
