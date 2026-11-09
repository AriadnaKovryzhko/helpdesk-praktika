import { useQueryClient } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import { api } from '@/api/client';
import { ticketKeys, useComments } from '@/api/tickets';
import type { Comment } from '@/api/types';
import { formatDateTime } from '@/lib/format';
import {
  Button,
  Card,
  ConfirmDialog,
  EmptyState,
  ErrorState,
  LoadingState,
  TextAreaField,
  useToast,
} from '@/ui';

function CommentItem({ comment, ticketId }: { comment: Comment; ticketId: string }) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [editing, setEditing] = useState(false);
  const [body, setBody] = useState(comment.body);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const url = `/tickets/${ticketId}/comments/${comment.id}`;

  const refresh = () => queryClient.invalidateQueries({ queryKey: ticketKeys.comments(ticketId) });

  const save = async () => {
    if (!body.trim()) return;
    setBusy(true);
    try {
      await api.patch(url, { body: body.trim() });
      await refresh();
      setEditing(false);
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    setBusy(true);
    try {
      await api.delete(url);
      await refresh();
    } catch (error) {
      toast.error((error as Error).message);
      setBusy(false);
      setConfirming(false);
    }
  };

  return (
    <li className="border-t border-ink-100 py-3 first:border-t-0">
      <div className="mb-1 flex flex-wrap items-baseline justify-between gap-x-3 text-xs text-ink-500">
        <span className="font-medium text-ink-800">{comment.author.fullName}</span>
        <time dateTime={comment.createdAt}>{formatDateTime(comment.createdAt)}</time>
      </div>
      {editing ? (
        <div className="flex flex-col gap-2">
          <TextAreaField
            label="Текст комментария"
            rows={3}
            value={body}
            onChange={(event) => setBody(event.target.value)}
          />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" size="sm" onClick={() => setEditing(false)}>
              Отмена
            </Button>
            <Button size="sm" loading={busy} onClick={() => void save()}>
              Сохранить
            </Button>
          </div>
        </div>
      ) : (
        <p className="whitespace-pre-wrap break-words text-sm text-ink-800">{comment.body}</p>
      )}
      {!editing && (comment.canEdit || comment.canDelete) && (
        <div className="mt-1 flex gap-3 text-xs">
          {comment.canEdit && (
            <button className="text-brand-600 hover:underline" onClick={() => setEditing(true)}>
              Изменить
            </button>
          )}
          {comment.canDelete && (
            <button className="text-red-600 hover:underline" onClick={() => setConfirming(true)}>
              Удалить
            </button>
          )}
        </div>
      )}
      {confirming && (
        <ConfirmDialog
          title="Удалить комментарий?"
          message="Комментарий будет удалён без возможности восстановления."
          loading={busy}
          onCancel={() => setConfirming(false)}
          onConfirm={() => void remove()}
        />
      )}
    </li>
  );
}

export function CommentsSection({ ticketId, closed }: { ticketId: string; closed: boolean }) {
  const queryClient = useQueryClient();
  const comments = useComments(ticketId);
  const toast = useToast();
  const [body, setBody] = useState('');
  const [error, setError] = useState<string>();
  const [sending, setSending] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!body.trim()) {
      setError('Введите текст комментария');
      return;
    }
    setError(undefined);
    setSending(true);
    try {
      await api.post(`/tickets/${ticketId}/comments`, { body: body.trim() });
      setBody('');
      await queryClient.invalidateQueries({ queryKey: ticketKeys.comments(ticketId) });
    } catch (caught) {
      toast.error((caught as Error).message);
    } finally {
      setSending(false);
    }
  };

  return (
    <Card className="p-5">
      <h2 className="mb-3 font-semibold text-ink-900">Комментарии</h2>
      {comments.isPending ? (
        <LoadingState />
      ) : comments.isError ? (
        <ErrorState error={comments.error} onRetry={() => void comments.refetch()} />
      ) : comments.data.length === 0 ? (
        <EmptyState title="Комментариев пока нет" />
      ) : (
        <ul>
          {comments.data.map((comment) => (
            <CommentItem key={comment.id} comment={comment} ticketId={ticketId} />
          ))}
        </ul>
      )}
      {!closed && (
        <form
          noValidate
          onSubmit={(event) => void submit(event)}
          className="mt-4 flex flex-col gap-2"
        >
          <TextAreaField
            label="Новый комментарий"
            rows={3}
            value={body}
            error={error}
            maxLength={5000}
            onChange={(event) => setBody(event.target.value)}
          />
          <div className="flex justify-end">
            <Button type="submit" loading={sending}>
              Отправить
            </Button>
          </div>
        </form>
      )}
    </Card>
  );
}
