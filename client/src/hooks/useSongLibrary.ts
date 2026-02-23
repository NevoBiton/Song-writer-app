import { useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Song } from '../types';
import { parseChordProDocument } from '../utils/chordParser';
import api from '@/lib/api';

function uid(): string {
  return Math.random().toString(36).slice(2, 10);
}

// Map API song (snake_case timestamps, json sections) to frontend Song type
export function apiToSong(data: Record<string, unknown>): Song {
  return {
    id: data.id as string,
    title: data.title as string,
    artist: (data.artist as string | null) || undefined,
    key: (data.key as string | null) || undefined,
    capo: (data.capo as number) ?? 0,
    language: (data.language as Song['language']) || 'en',
    sections: (data.sections as Song['sections']) || [],
    createdAt: data.created_at as string,
    updatedAt: data.updated_at as string,
  };
}

export type DeletedSong = Song & { deletedAt: string };

const SONGS_KEY = ['songs'] as const;
const DELETED_SONGS_KEY = ['songs', 'deleted'] as const;

function apiToDeletedSong(data: Record<string, unknown>): DeletedSong {
  return {
    ...apiToSong(data),
    deletedAt: data.deleted_at as string,
  };
}

export function useSongLibrary() {
  const client = useQueryClient();

  const { data: songs = [], isLoading: loading } = useQuery({
    queryKey: SONGS_KEY,
    queryFn: async () => {
      const { data } = await api.get<Record<string, unknown>[]>('/songs');
      return data.map(apiToSong).reverse(); // newest first
    },
  });

  const createMutation = useMutation({
    mutationFn: async ({ title, language }: { title: string; language: Song['language'] }) => {
      const payload = {
        title: title || 'Untitled',
        language,
        sections: [
          {
            id: uid(),
            type: 'verse',
            label: language === 'he' ? 'בית 1' : 'Verse 1',
            lines: [],
          },
        ],
      };
      const { data } = await api.post<Record<string, unknown>>('/songs', payload);
      return apiToSong(data);
    },
    onSuccess: (newSong) => {
      client.setQueryData<Song[]>(SONGS_KEY, (old = []) => [newSong, ...old]);
    },
  });

  const { data: deletedSongs = [] } = useQuery({
    queryKey: DELETED_SONGS_KEY,
    queryFn: async () => {
      const { data } = await api.get<Record<string, unknown>[]>('/songs/deleted');
      return data.map(apiToDeletedSong);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/songs/${id}`);
    },
    onMutate: async (id: string) => {
      await client.cancelQueries({ queryKey: SONGS_KEY });
      const previousSongs = client.getQueryData<Song[]>(SONGS_KEY);
      client.setQueryData<Song[]>(SONGS_KEY, (old = []) => old.filter(s => s.id !== id));
      return { previousSongs };
    },
    onError: (_err, _id, context) => {
      if (context?.previousSongs) {
        client.setQueryData<Song[]>(SONGS_KEY, context.previousSongs);
      }
    },
    onSuccess: () => {
      client.invalidateQueries({ queryKey: DELETED_SONGS_KEY });
    },
  });

  const restoreMutation = useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.post<Record<string, unknown>>(`/songs/deleted/${id}/restore`);
      return apiToSong(data);
    },
    onSuccess: (restored) => {
      client.setQueryData<Song[]>(SONGS_KEY, (old = []) => [restored, ...old]);
      client.setQueryData<DeletedSong[]>(DELETED_SONGS_KEY, (old = []) => old.filter(s => s.id !== restored.id));
    },
  });

  const permanentDeleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/songs/deleted/${id}`);
    },
    onMutate: async (id: string) => {
      client.setQueryData<DeletedSong[]>(DELETED_SONGS_KEY, (old = []) => old.filter(s => s.id !== id));
    },
  });

  const duplicateMutation = useMutation({
    mutationFn: async (id: string) => {
      const original = songs.find(s => s.id === id);
      if (!original) throw new Error('Song not found');
      const copy = {
        title: `${original.title} (copy)`,
        artist: original.artist,
        key: original.key,
        capo: original.capo,
        language: original.language,
        sections: original.sections,
      };
      const { data } = await api.post<Record<string, unknown>>('/songs', copy);
      return apiToSong(data);
    },
    onSuccess: (newSong) => {
      client.setQueryData<Song[]>(SONGS_KEY, (old = []) => [newSong, ...old]);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (song: Song) => {
      const { data } = await api.put<Record<string, unknown>>(`/songs/${song.id}`, song);
      return apiToSong(data);
    },
    onSuccess: (updated) => {
      client.setQueryData<Song[]>(SONGS_KEY, (old = []) =>
        old.map(s => (s.id === updated.id ? updated : s))
      );
    },
  });

  const importMutation = useMutation({
    mutationFn: async (text: string) => {
      const parsed = parseChordProDocument(text);
      const payload = {
        title: parsed.title || 'Imported Song',
        artist: parsed.artist,
        key: parsed.key,
        language: 'en' as const,
        sections:
          parsed.sections.length > 0
            ? parsed.sections
            : [{ id: uid(), type: 'verse' as const, label: 'Verse 1', lines: [] }],
      };
      const { data } = await api.post<Record<string, unknown>>('/songs', payload);
      return apiToSong(data);
    },
    onSuccess: (newSong) => {
      client.setQueryData<Song[]>(SONGS_KEY, (old = []) => [newSong, ...old]);
    },
  });

  const createSong = useCallback(
    (title: string, language: Song['language'] = 'en') =>
      createMutation.mutateAsync({ title, language }),
    [createMutation]
  );

  const deleteSong = useCallback(
    (id: string) => deleteMutation.mutateAsync(id),
    [deleteMutation]
  );

  const duplicateSong = useCallback(
    (id: string) => duplicateMutation.mutateAsync(id),
    [duplicateMutation]
  );

  const updateSong = useCallback(
    (song: Song) => updateMutation.mutateAsync(song),
    [updateMutation]
  );

  const importChordPro = useCallback(
    (text: string) => importMutation.mutateAsync(text),
    [importMutation]
  );

  const getSong = useCallback(
    (id: string) => songs.find(s => s.id === id),
    [songs]
  );

  const restoreSong = useCallback(
    (id: string) => restoreMutation.mutateAsync(id),
    [restoreMutation]
  );

  const permanentDeleteSong = useCallback(
    (id: string) => permanentDeleteMutation.mutateAsync(id),
    [permanentDeleteMutation]
  );

  return {
    songs,
    loading,
    createSong,
    deleteSong,
    duplicateSong,
    updateSong,
    importChordPro,
    getSong,
    deletedSongs,
    restoreSong,
    permanentDeleteSong,
  };
}
