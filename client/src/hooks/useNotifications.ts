import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';

export interface AppNotification {
  id: string;
  type:
    | 'friend_request'
    | 'friend_accepted'
    | 'collaborator_invited'
    | 'collaborator_joined'
    | 'proposal_submitted'
    | 'proposal_accepted'
    | 'proposal_rejected';
  data: Record<string, unknown>;
  isRead: boolean;
  createdAt: string;
}

interface NotificationsPage {
  items: AppNotification[];
  nextCursor: string | null;
}

export function useNotifications() {
  return useInfiniteQuery<NotificationsPage, Error, NotificationsPage, ['notifications'], string | undefined>({
    queryKey: ['notifications'],
    queryFn: ({ pageParam }) =>
      api.get<NotificationsPage>('/notifications', {
        params: pageParam ? { cursor: pageParam } : {},
      }).then(r => r.data),
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    initialPageParam: undefined,
  });
}

export function useMarkRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.patch(`/notifications/${id}/read`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });
}

export function useMarkAllRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.post('/notifications/read-all'),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });
}

export function useMarkPassiveRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.post('/notifications/read-passive'),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });
}

export function useDeleteNotification() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/notifications/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });
}
