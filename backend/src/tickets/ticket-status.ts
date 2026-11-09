import { TicketStatus } from '@prisma/client';

export const TRANSITIONS: Record<TicketStatus, TicketStatus[]> = {
  [TicketStatus.NEW]: [TicketStatus.ASSIGNED],
  [TicketStatus.ASSIGNED]: [TicketStatus.IN_PROGRESS],
  [TicketStatus.IN_PROGRESS]: [TicketStatus.WAITING_USER, TicketStatus.RESOLVED],
  [TicketStatus.WAITING_USER]: [TicketStatus.IN_PROGRESS],
  [TicketStatus.RESOLVED]: [TicketStatus.CLOSED, TicketStatus.IN_PROGRESS],
  [TicketStatus.CLOSED]: [],
};

export const OPEN_STATUSES: TicketStatus[] = [
  TicketStatus.NEW,
  TicketStatus.ASSIGNED,
  TicketStatus.IN_PROGRESS,
  TicketStatus.WAITING_USER,
];

export const STATUS_LABELS: Record<TicketStatus, string> = {
  [TicketStatus.NEW]: 'Новая',
  [TicketStatus.ASSIGNED]: 'Назначена',
  [TicketStatus.IN_PROGRESS]: 'В работе',
  [TicketStatus.WAITING_USER]: 'Ожидает ответа',
  [TicketStatus.RESOLVED]: 'Решена',
  [TicketStatus.CLOSED]: 'Закрыта',
};
