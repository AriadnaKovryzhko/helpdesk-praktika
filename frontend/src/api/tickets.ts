import { useQuery } from '@tanstack/react-query';
import { api, type QueryParams } from './client';
import type {
  Attachment,
  Category,
  Comment,
  SlaPolicy,
  StatusHistoryEntry,
  Ticket,
  TicketDetails,
  UserBrief,
} from './types';

export const ticketKeys = {
  all: ['tickets'] as const,
  list: (query: QueryParams) => ['tickets', 'list', query] as const,
  details: (id: string) => ['tickets', 'details', id] as const,
  comments: (id: string) => ['tickets', 'comments', id] as const,
  attachments: (id: string) => ['tickets', 'attachments', id] as const,
  history: (id: string) => ['tickets', 'history', id] as const,
};

export const useTickets = (query: QueryParams) =>
  useQuery({
    queryKey: ticketKeys.list(query),
    queryFn: () => api.page<Ticket[]>('/tickets', query),
    placeholderData: (previous) => previous,
  });

export const useTicket = (id: string) =>
  useQuery({
    queryKey: ticketKeys.details(id),
    queryFn: () => api.get<TicketDetails>(`/tickets/${id}`),
  });

export const useComments = (id: string) =>
  useQuery({
    queryKey: ticketKeys.comments(id),
    queryFn: () => api.get<Comment[]>(`/tickets/${id}/comments`),
  });

export const useAttachments = (id: string) =>
  useQuery({
    queryKey: ticketKeys.attachments(id),
    queryFn: () => api.get<Attachment[]>(`/tickets/${id}/attachments`),
  });

export const useHistory = (id: string) =>
  useQuery({
    queryKey: ticketKeys.history(id),
    queryFn: () => api.get<StatusHistoryEntry[]>(`/tickets/${id}/history`),
  });

export const useCategories = (includeInactive = false) =>
  useQuery({
    queryKey: ['categories', includeInactive],
    queryFn: () => api.get<Category[]>('/categories', { includeInactive }),
    staleTime: 60_000,
  });

export const useSlaPolicies = () =>
  useQuery({
    queryKey: ['sla-policies'],
    queryFn: () => api.get<SlaPolicy[]>('/sla-policies'),
    staleTime: 60_000,
  });

export const useAgents = (enabled: boolean) =>
  useQuery({
    queryKey: ['agents'],
    queryFn: () => api.get<UserBrief[]>('/users/agents'),
    enabled,
    staleTime: 60_000,
  });
