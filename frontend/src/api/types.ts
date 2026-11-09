export type Role = 'USER' | 'AGENT' | 'MANAGER';
export type TicketStatus =
  'NEW' | 'ASSIGNED' | 'IN_PROGRESS' | 'WAITING_USER' | 'RESOLVED' | 'CLOSED';
export type Priority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface PageMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface UserBrief {
  id: string;
  fullName: string;
  email: string;
}

export interface User extends UserBrief {
  phone: string | null;
  roles: Role[];
  isBlocked: boolean;
  createdAt: string;
}

export interface Session {
  accessToken: string;
  user: User;
}

export interface Ticket {
  id: string;
  number: number;
  title: string;
  description: string;
  status: TicketStatus;
  priority: Priority;
  category: { id: number; name: string };
  author: UserBrief;
  assignee: UserBrief | null;
  reactionDueAt: string;
  resolutionDueAt: string;
  reactedAt: string | null;
  resolvedAt: string | null;
  closedAt: string | null;
  reactionBreachedAt: string | null;
  resolutionBreachedAt: string | null;
  isOverdue: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TicketDetails extends Ticket {
  allowedTransitions: TicketStatus[];
  canEdit: boolean;
  canDelete: boolean;
  canTake: boolean;
  canAssign: boolean;
}

export interface StatusHistoryEntry {
  id: string;
  fromStatus: TicketStatus | null;
  toStatus: TicketStatus;
  comment: string | null;
  changedBy: UserBrief;
  createdAt: string;
}

export interface Comment {
  id: string;
  body: string;
  author: UserBrief;
  canEdit: boolean;
  canDelete: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Attachment {
  id: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  uploader: UserBrief;
  canDelete: boolean;
  createdAt: string;
}

export interface Category {
  id: number;
  name: string;
  description: string | null;
  isActive: boolean;
}

export interface SlaPolicy {
  id: number;
  priority: Priority;
  reactionMinutes: number;
  resolutionMinutes: number;
}

export type NotificationType =
  'TICKET_CREATED' | 'TICKET_ASSIGNED' | 'STATUS_CHANGED' | 'COMMENT_ADDED' | 'SLA_BREACHED';

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  ticketId: string | null;
  readAt: string | null;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  action: string;
  entityType: string;
  entityId: string | null;
  details: Record<string, unknown> | null;
  ip: string | null;
  actor: UserBrief | null;
  createdAt: string;
}

export interface Dashboard {
  totals: { all: number; open: number; overdue: number; createdToday: number };
  byStatus: { status: TicketStatus; count: number }[];
  sla: {
    compliancePercent: number;
    byPriority: { priority: Priority; breached: number; onTime: number }[];
  };
  agentLoad: { agent: UserBrief; open: number; overdue: number; resolved: number }[];
  createdByDay: { date: string; count: number }[];
}
