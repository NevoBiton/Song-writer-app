import { useState, useEffect, useCallback } from 'react';
import { Song } from '../types';
import { parseChordProDocument } from '../utils/chordParser';

const LIBRARY_KEY = 'songwriter_library';

function uid(): string {
  return Math.random().toString(36).slice(2, 10);
}

function now(): string {
  return new Date().toISOString();
}

function loadLibrary(): Song[] {
  try {
    const raw = localStorage.getItem(LIBRARY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLibrary(songs: Song[]): void {
  localStorage.setItem(LIBRARY_KEY, JSON.stringify(songs));
}

export function useSongLibrary() {
  const [songs, setSongs] = useState<Song[]>(loadLibrary);

  // Persist on change
  useEffect(() => {
    saveLibrary(songs);
  }, [songs]);

  const createSong = useCallback((title: string, language: Song['language'] = 'en'): Song => {
    const song: Song = {
      id: uid(),
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
      createdAt: now(),
      updatedAt: now(),
    };
    setSongs(prev => [song, ...prev]);
    return song;
  }, []);

  const deleteSong = useCallback((id: string) => {
    setSongs(prev => prev.filter(s => s.id !== id));
  }, []);

  const duplicateSong = useCallback((id: string): Song | undefined => {
    const original = loadLibrary().find(s => s.id === id);
    if (!original) return undefined;
    const copy: Song = {
      ...original,
      id: uid(),
      title: `${original.title} (copy)`,
      createdAt: now(),
      updatedAt: now(),
    };
    setSongs(prev => [copy, ...prev]);
    return copy;
  }, []);

  const updateSong = useCallback((song: Song) => {
    setSongs(prev =>
      prev.map(s => s.id === song.id ? { ...song, updatedAt: now() } : s)
    );
  }, []);

  const searchSongs = useCallback((query: string): Song[] => {
    const q = query.toLowerCase();
    return songs.filter(s =>
      s.title.toLowerCase().includes(q) ||
      (s.artist && s.artist.toLowerCase().includes(q)) ||
      (s.key && s.key.toLowerCase().includes(q))
    );
  }, [songs]);

  const importChordPro = useCallback((text: string): Song => {
    const parsed = parseChordProDocument(text);
    const song: Song = {
      id: uid(),
      title: parsed.title || 'Imported Song',
      artist: parsed.artist,
      key: parsed.key,
      language: 'en',
      sections: parsed.sections.length > 0
        ? parsed.sections
        : [{ id: uid(), type: 'verse', label: 'Verse 1', lines: [] }],
      createdAt: now(),
      updatedAt: now(),
    };
    setSongs(prev => [song, ...prev]);
    return song;
  }, []);

  const getSong = useCallback((id: string): Song | undefined => {
    return songs.find(s => s.id === id);
  }, [songs]);

  return {
    songs,
    createSong,
    deleteSong,
    duplicateSong,
    updateSong,
    searchSongs,
    importChordPro,
    getSong,
  };
}
