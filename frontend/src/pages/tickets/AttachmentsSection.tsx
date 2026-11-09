import { useQueryClient } from '@tanstack/react-query';
import { useRef, useState, type ChangeEvent } from 'react';
import { api, downloadFile } from '@/api/client';
import { ticketKeys, useAttachments } from '@/api/tickets';
import type { Attachment } from '@/api/types';
import { formatFileSize } from '@/lib/format';
import { Button, Card, ConfirmDialog, ErrorState, LoadingState, useToast } from '@/ui';

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED_EXTENSIONS = /\.(jpe?g|png|pdf|docx)$/i;

export function validateAttachment(file: File): string | null {
  if (!ALLOWED_EXTENSIONS.test(file.name)) return 'Разрешены только файлы jpg, png, pdf и docx';
  if (file.size > MAX_BYTES) return 'Размер файла превышает допустимые 5 МБ';
  return null;
}

export function AttachmentsSection({ ticketId, closed }: { ticketId: string; closed: boolean }) {
  const queryClient = useQueryClient();
  const attachments = useAttachments(ticketId);
  const toast = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [removing, setRemoving] = useState<Attachment | null>(null);
  const [busy, setBusy] = useState(false);

  const refresh = () =>
    queryClient.invalidateQueries({ queryKey: ticketKeys.attachments(ticketId) });

  const upload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    const problem = validateAttachment(file);
    if (problem) {
      toast.error(problem);
      return;
    }
    const form = new FormData();
    form.append('file', file);
    setUploading(true);
    try {
      await api.post(`/tickets/${ticketId}/attachments`, form);
      await refresh();
      toast.success('Файл загружен');
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setUploading(false);
    }
  };

  const download = (attachment: Attachment) => {
    downloadFile(
      `/tickets/${ticketId}/attachments/${attachment.id}/download`,
      attachment.originalName,
    ).catch((error: Error) => toast.error(error.message));
  };

  const remove = async () => {
    if (!removing) return;
    setBusy(true);
    try {
      await api.delete(`/tickets/${ticketId}/attachments/${removing.id}`);
      await refresh();
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setBusy(false);
      setRemoving(null);
    }
  };

  return (
    <Card className="p-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-semibold text-ink-900">Вложения</h2>
        {!closed && (
          <>
            <input
              ref={inputRef}
              type="file"
              aria-label="Выбрать файл"
              accept=".jpg,.jpeg,.png,.pdf,.docx"
              className="hidden"
              onChange={(event) => void upload(event)}
            />
            <Button
              variant="secondary"
              size="sm"
              loading={uploading}
              onClick={() => inputRef.current?.click()}
            >
              Прикрепить файл
            </Button>
          </>
        )}
      </div>
      {attachments.isPending ? (
        <LoadingState />
      ) : attachments.isError ? (
        <ErrorState error={attachments.error} onRetry={() => void attachments.refetch()} />
      ) : attachments.data.length === 0 ? (
        <p className="text-sm text-ink-500">
          Файлы не прикреплены. Допустимы jpg, png, pdf, docx до 5 МБ.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {attachments.data.map((attachment) => (
            <li key={attachment.id} className="flex items-center justify-between gap-3 text-sm">
              <button
                className="min-w-0 truncate text-left text-brand-600 hover:underline"
                onClick={() => download(attachment)}
              >
                {attachment.originalName}
              </button>
              <span className="flex shrink-0 items-center gap-3 text-xs text-ink-500">
                {formatFileSize(attachment.sizeBytes)}
                {attachment.canDelete && (
                  <button
                    className="text-red-600 hover:underline"
                    onClick={() => setRemoving(attachment)}
                  >
                    Удалить
                  </button>
                )}
              </span>
            </li>
          ))}
        </ul>
      )}
      {removing && (
        <ConfirmDialog
          title="Удалить вложение?"
          message={`Файл «${removing.originalName}» будет удалён без возможности восстановления.`}
          loading={busy}
          onCancel={() => setRemoving(null)}
          onConfirm={() => void remove()}
        />
      )}
    </Card>
  );
}
