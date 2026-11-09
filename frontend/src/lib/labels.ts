import type { NotificationType, Priority, Role, TicketStatus } from '@/api/types';

export const STATUS_LABELS: Record<TicketStatus, string> = {
  NEW: 'Новая',
  ASSIGNED: 'Назначена',
  IN_PROGRESS: 'В работе',
  WAITING_USER: 'Ожидает ответа',
  RESOLVED: 'Решена',
  CLOSED: 'Закрыта',
};

export const PRIORITY_LABELS: Record<Priority, string> = {
  LOW: 'Низкий',
  MEDIUM: 'Средний',
  HIGH: 'Высокий',
  CRITICAL: 'Критический',
};

export const ROLE_LABELS: Record<Role, string> = {
  USER: 'Пользователь',
  AGENT: 'Исполнитель',
  MANAGER: 'Руководитель',
};

export const TRANSITION_LABELS: Record<TicketStatus, string> = {
  NEW: 'Новая',
  ASSIGNED: 'Назначить',
  IN_PROGRESS: 'В работу',
  WAITING_USER: 'Запросить ответ',
  RESOLVED: 'Отметить решённой',
  CLOSED: 'Закрыть',
};

export const NOTIFICATION_LABELS: Record<NotificationType, string> = {
  TICKET_CREATED: 'Новая заявка',
  TICKET_ASSIGNED: 'Назначение',
  STATUS_CHANGED: 'Статус',
  COMMENT_ADDED: 'Комментарий',
  SLA_BREACHED: 'Просрочка',
};

export const STATUSES = Object.keys(STATUS_LABELS) as TicketStatus[];
export const PRIORITIES = Object.keys(PRIORITY_LABELS) as Priority[];
export const ROLES = Object.keys(ROLE_LABELS) as Role[];
