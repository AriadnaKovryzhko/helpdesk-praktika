import { useState, type FormEvent } from 'react';
import { useCategories } from '@/api/tickets';
import type { Priority } from '@/api/types';
import { PRIORITIES, PRIORITY_LABELS } from '@/lib/labels';
import { useFormErrors } from '@/lib/useFormErrors';
import { Button, FormError, SelectField, TextAreaField, TextField } from '@/ui';

export interface TicketFormValues {
  title: string;
  description: string;
  categoryId: number;
  priority: Priority;
}

interface TicketFormProps {
  initial?: TicketFormValues;
  submitLabel: string;
  onSubmit: (values: TicketFormValues) => Promise<void>;
  onCancel?: () => void;
}

export function TicketForm({ initial, submitLabel, onSubmit, onCancel }: TicketFormProps) {
  const categories = useCategories();
  const [title, setTitle] = useState(initial?.title ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [categoryId, setCategoryId] = useState(initial ? String(initial.categoryId) : '');
  const [priority, setPriority] = useState<Priority>(initial?.priority ?? 'MEDIUM');
  const [submitting, setSubmitting] = useState(false);
  const { errors, formError, showClientErrors, showServerError } = useFormErrors();

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const trimmedTitle = title.trim();
    const trimmedDescription = description.trim();
    const valid = showClientErrors({
      title:
        trimmedTitle.length < 5 || trimmedTitle.length > 200
          ? 'Тема должна содержать от 5 до 200 символов'
          : undefined,
      description:
        trimmedDescription.length < 10 || trimmedDescription.length > 5000
          ? 'Описание должно содержать от 10 до 5000 символов'
          : undefined,
      categoryId: categoryId ? undefined : 'Выберите категорию',
    });
    if (!valid) return;
    setSubmitting(true);
    try {
      await onSubmit({
        title: trimmedTitle,
        description: trimmedDescription,
        categoryId: Number(categoryId),
        priority,
      });
    } catch (error) {
      showServerError(error);
      setSubmitting(false);
    }
  };

  return (
    <form noValidate onSubmit={(event) => void submit(event)} className="flex flex-col gap-4">
      <FormError message={formError} />
      <TextField
        label="Тема"
        value={title}
        error={errors.title}
        maxLength={200}
        onChange={(event) => setTitle(event.target.value)}
      />
      <TextAreaField
        label="Описание"
        rows={6}
        value={description}
        error={errors.description}
        onChange={(event) => setDescription(event.target.value)}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <SelectField
          label="Категория"
          value={categoryId}
          error={errors.categoryId}
          onChange={(event) => setCategoryId(event.target.value)}
        >
          <option value="">Выберите категорию</option>
          {categories.data?.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </SelectField>
        <SelectField
          label="Приоритет"
          value={priority}
          error={errors.priority}
          onChange={(event) => setPriority(event.target.value as Priority)}
        >
          {PRIORITIES.map((value) => (
            <option key={value} value={value}>
              {PRIORITY_LABELS[value]}
            </option>
          ))}
        </SelectField>
      </div>
      <div className="flex flex-wrap justify-end gap-2">
        {onCancel && (
          <Button variant="secondary" onClick={onCancel}>
            Отмена
          </Button>
        )}
        <Button type="submit" loading={submitting}>
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
