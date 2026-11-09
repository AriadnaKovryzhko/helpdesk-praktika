const dateTime = new Intl.DateTimeFormat('ru-RU', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});
const shortDate = new Intl.DateTimeFormat('ru-RU', { day: '2-digit', month: '2-digit' });

export const formatDateTime = (value: string): string => dateTime.format(new Date(value));
export const formatShortDate = (value: string): string => shortDate.format(new Date(value));

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} Б`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} КБ`;
  return `${(bytes / (1024 * 1024)).toFixed(1).replace('.', ',')} МБ`;
}

export function formatMinutes(minutes: number): string {
  const days = Math.floor(minutes / 1440);
  const hours = Math.floor((minutes % 1440) / 60);
  const rest = minutes % 60;
  const parts = [days && `${days} д`, hours && `${hours} ч`, rest && `${rest} мин`].filter(Boolean);
  return parts.join(' ') || '0 мин';
}

export function formatDuration(milliseconds: number): string {
  const total = Math.floor(Math.abs(milliseconds) / 1000);
  const days = Math.floor(total / 86_400);
  const hours = Math.floor((total % 86_400) / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  const clock = [hours, minutes, seconds].map((part) => String(part).padStart(2, '0')).join(':');
  return days > 0 ? `${days} д ${clock}` : clock;
}
