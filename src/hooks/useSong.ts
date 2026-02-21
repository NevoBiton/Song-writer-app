import { useState, useCallback, useRef, useEffect } from 'react';
import { Song, Section } from '../types';
import { tokenizeLines } from '../utils/chordParser';
import { transposeSong } from '../utils/transpose';

const MAX_HISTORY = 50;

function uid(): string {
  return Math.random().toString(36).slice(2, 10);
}

function now(): string {
  return new Date().toISOString();
}

export function useSong(
  initialSong: Song,
  onSave?: (song: Song) => void
) {
  const [song, setSong] = useState<Song>(initialSong);
  const [history, setHistory] = useState<Song[]>([initialSong]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [savedIndicator, setSavedIndicator] = useState(false);
  const saveTimer = useRef<number | null>(null);
  const saveIndicatorTimer = useRef<number | null>(null);

  // Sync when external song changes (e.g. switching songs)
  useEffect(() => {
    setSong(initialSong);
    setHistory([initialSong]);
    setHistoryIndex(0);
  }, [initialSong.id]);

  function commit(next: Song): void {
    const updated = { ...next, updatedAt: now() };
    setSong(updated);
    setHistory(prev => {
      const trimmed = prev.slice(0, historyIndex + 1);
      const newHistory = [...trimmed, updated].slice(-MAX_HISTORY);
      setHistoryIndex(newHistory.length - 1);
      return newHistory;
    });

    // Auto-save with 2s debounce
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => {
      onSave?.(updated);
      setSavedIndicator(true);
      if (saveIndicatorTimer.current) clearTimeout(saveIndicatorTimer.current);
      saveIndicatorTimer.current = window.setTimeout(() => setSavedIndicator(false), 2000);
    }, 2000);
  }

  const undo = useCallback(() => {
    setHistoryIndex(prev => {
      const newIdx = Math.max(0, prev - 1);
      setSong(history[newIdx]);
      return newIdx;
    });
  }, [history]);

  const redo = useCallback(() => {
    setHistoryIndex(prev => {
      const newIdx = Math.min(history.length - 1, prev + 1);
      setSong(history[newIdx]);
      return newIdx;
    });
  }, [history]);

  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;

  // ─── Token / chord ops ───────────────────────────────────────────────

  const addChordToToken = useCallback((sectionId: string, lineId: string, tokenId: string, chord: string) => {
    commit({
      ...song,
      sections: song.sections.map(sec =>
        sec.id !== sectionId ? sec : {
          ...sec,
          lines: sec.lines.map(line =>
            line.id !== lineId ? line : {
              ...line,
              tokens: line.tokens.map(token =>
                token.id !== tokenId ? token : { ...token, chord }
              ),
            }
          ),
        }
      ),
    });
  }, [song]);

  const removeChordFromToken = useCallback((sectionId: string, lineId: string, tokenId: string) => {
    commit({
      ...song,
      sections: song.sections.map(sec =>
        sec.id !== sectionId ? sec : {
          ...sec,
          lines: sec.lines.map(line =>
            line.id !== lineId ? line : {
              ...line,
              tokens: line.tokens.map(token =>
                token.id !== tokenId ? token : { ...token, chord: undefined }
              ),
            }
          ),
        }
      ),
    });
  }, [song]);

  // ─── Section ops ─────────────────────────────────────────────────────

  const updateSectionLabel = useCallback((sectionId: string, label: string) => {
    commit({
      ...song,
      sections: song.sections.map(sec =>
        sec.id !== sectionId ? sec : { ...sec, label }
      ),
    });
  }, [song]);

  const updateSectionType = useCallback((sectionId: string, type: Section['type']) => {
    commit({
      ...song,
      sections: song.sections.map(sec =>
        sec.id !== sectionId ? sec : { ...sec, type }
      ),
    });
  }, [song]);

  const addSection = useCallback((type: Section['type']) => {
    const labels: Record<Section['type'], string> = {
      verse: 'Verse', chorus: 'Chorus', bridge: 'Bridge',
      intro: 'Intro', outro: 'Outro', custom: 'Section',
    };
    const newSection: Section = {
      id: uid(),
      type,
      label: labels[type],
      lines: [],
    };
    commit({ ...song, sections: [...song.sections, newSection] });
  }, [song]);

  const removeSection = useCallback((sectionId: string) => {
    if (song.sections.length <= 1) return;
    commit({
      ...song,
      sections: song.sections.filter(sec => sec.id !== sectionId),
    });
  }, [song]);

  // ─── Lyrics editing ──────────────────────────────────────────────────

  const setLyrics = useCallback((sectionId: string, text: string) => {
    const existingSection = song.sections.find(s => s.id === sectionId);
    if (!existingSection) return;

    // Preserve existing chord mappings where possible
    const existingChords = new Map<string, string>();
    existingSection.lines.forEach(line => {
      line.tokens.forEach(token => {
        if (token.chord && !token.isSpace) {
          existingChords.set(token.text, token.chord);
        }
      });
    });

    const newLines = tokenizeLines(text);

    commit({
      ...song,
      sections: song.sections.map(sec =>
        sec.id !== sectionId ? sec : { ...sec, lines: newLines }
      ),
    });
  }, [song]);

  // ─── Song metadata ───────────────────────────────────────────────────

  const updateTitle = useCallback((title: string) => {
    commit({ ...song, title });
  }, [song]);

  const updateArtist = useCallback((artist: string) => {
    commit({ ...song, artist });
  }, [song]);

  const updateKey = useCallback((key: string) => {
    commit({ ...song, key });
  }, [song]);

  const updateCapo = useCallback((capo: number) => {
    commit({ ...song, capo });
  }, [song]);

  const updateLanguage = useCallback((language: Song['language']) => {
    commit({ ...song, language });
  }, [song]);

  const transpose = useCallback((semitones: number) => {
    commit(transposeSong(song, semitones));
  }, [song]);

  return {
    song,
    undo,
    redo,
    canUndo,
    canRedo,
    savedIndicator,
    addChordToToken,
    removeChordFromToken,
    updateSectionLabel,
    updateSectionType,
    addSection,
    removeSection,
    setLyrics,
    updateTitle,
    updateArtist,
    updateKey,
    updateCapo,
    updateLanguage,
    transpose,
  };
}
