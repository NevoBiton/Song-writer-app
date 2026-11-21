import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { Collaborator, SongDraft, SongVersion } from '@/types';

export function useCollaborators(songId: string) {
  return useQuery<Collaborator[]>({
    queryKey: ['collaborators', songId],
    queryFn: () => api.get(`/songs/${songId}/collaborators`).then(r => r.data),
  });
}

export function useProposals(songId: string) {
  return useQuery<SongDraft[]>({
    queryKey: ['proposals', songId],
    queryFn: () => api.get(`/songs/${songId}/proposals`).then(r => r.data),
  });
}

export function useDraft(songId: string, enabled = true) {
  return useQuery<SongDraft>({
    queryKey: ['draft', songId],
    queryFn: () => api.get(`/songs/${songId}/draft`).then(r => r.data),
    enabled,
  });
}

export function useVersions(songId: string) {
  return useQuery<SongVersion[]>({
    queryKey: ['versions', songId],
    queryFn: () => api.get(`/songs/${songId}/versions`).then(r => r.data),
  });
}

export function useRemoveCollaborator(songId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => api.delete(`/songs/${songId}/collaborators/${userId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['collaborators', songId] }),
  });
}

export function useLeaveSong(songId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => api.delete(`/songs/${songId}/collaborators/${userId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['songs'] });
      qc.invalidateQueries({ queryKey: ['collaborators', songId] });
    },
  });
}

export function useInviteFriend(songId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => api.post(`/songs/${songId}/invite`, { userId }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['collaborators', songId] }),
  });
}

export function useAcceptInvite(songId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.post(`/songs/${songId}/invite/accept`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['songs'] });
      qc.invalidateQueries({ queryKey: ['collaborators', songId] });
    },
  });
}

export function useDeclineInvite(songId: string) {
  return useMutation({
    mutationFn: () => api.post(`/songs/${songId}/invite/decline`),
  });
}

export function useGenerateInviteLink(songId: string) {
  return useMutation({
    mutationFn: () =>
      api.post<{ url: string; expiresAt: string }>(`/songs/${songId}/invite-link`).then(r => r.data),
  });
}

export function useSaveDraft(songId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (sections: unknown[]) => api.put(`/songs/${songId}/draft`, { sections }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['draft', songId] }),
  });
}

export function useProposeDraft(songId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (note?: string) => api.post(`/songs/${songId}/draft/propose`, { note }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['draft', songId] });
      qc.invalidateQueries({ queryKey: ['proposals', songId] });
    },
  });
}

export function useAcceptProposal(songId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (draftId: string) =>
      api.post(`/songs/${songId}/proposals/${draftId}/accept`).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['proposals', songId] });
      qc.invalidateQueries({ queryKey: ['versions', songId] });
      qc.invalidateQueries({ queryKey: ['songs'] });
    },
  });
}

export function useRejectProposal(songId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (draftId: string) => api.post(`/songs/${songId}/proposals/${draftId}/reject`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['proposals', songId] }),
  });
}
