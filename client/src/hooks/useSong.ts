import { useState, useCallback, useRef, useEffect } from 'react';
import { Song, Section } from '../types';
import { tokenizeLines } from '../utils/chordParser';
import { transposeSong } from '../utils/transpose';

function detectLanguage(sections: Section[]): Song['language'] {
  const allText = sections
    .flatMap(s => s.lines.flatMap(l => l.tokens.map(t => t.text)))
    .join(' ');
  const hasHebrew = /[\u0590-\u05FF]/.test(allText);
  const hasLatin = /[a-zA-Z]/.test(allText);
  if (hasHebrew && hasLatin) return 'mixed';
  if (hasHebrew) return 'he';
  return 'en';
}

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

    const newLines = tokenizeLines(text);

    // Flatten all word tokens from old and new sections
    const oldWords = existingSection.lines.flatMap(l => l.tokens.filter(t => !t.isSpace));
    const newWords = newLines.flatMap(l => l.tokens.filter(t => !t.isSpace));

    // LCS: find which new words match which old words (by text)
    const m = oldWords.length;
    const n = newWords.length;
    const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        dp[i][j] = oldWords[i - 1].text === newWords[j - 1].text
          ? dp[i - 1][j - 1] + 1
          : Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }

    // Backtrack to build newWordIndex → oldWordIndex map
    const matchMap = new Map<number, number>();
    let i = m, j = n;
    while (i > 0 && j > 0) {
      if (oldWords[i - 1].text === newWords[j - 1].text) {
        matchMap.set(j - 1, i - 1);
        i--; j--;
      } else if (dp[i - 1][j] >= dp[i][j - 1]) {
        i--;
      } else {
        j--;
      }
    }

    // Fallback: match unmatched old words (with chords) to nearest unmatched new word
    // This preserves chords when the user edits a word's text (e.g. adds a letter)
    const matchedOld = new Set(matchMap.values());
    const matchedNew = new Set(matchMap.keys());
    const unmatchedOldChords = oldWords
      .map((t, idx) => ({ t, idx }))
      .filter(({ t, idx }) => t.chord && !matchedOld.has(idx));
    const unmatchedNewIdxs = Array.from({ length: n }, (_, idx) => idx)
      .filter(idx => !matchedNew.has(idx));

    for (const { t: _t, idx: oi } of unmatchedOldChords) {
      if (unmatchedNewIdxs.length === 0) break;
      let bestNi = -1, bestDist = Infinity;
      for (const ni of unmatchedNewIdxs) {
        const dist = Math.abs(ni - oi);
        if (dist < bestDist) { bestDist = dist; bestNi = ni; }
      }
      if (bestNi !== -1 && bestDist <= 1) {
        matchMap.set(bestNi, oi);
        unmatchedNewIdxs.splice(unmatchedNewIdxs.indexOf(bestNi), 1);
      }
    }

    // Apply matched chords to new tokens
    let wordIdx = 0;
    const restoredLines = newLines.map(line => ({
      ...line,
      tokens: line.tokens.map(token => {
        if (token.isSpace) return token;
        const newIdx = wordIdx++;
        const oldIdx = matchMap.get(newIdx);
        if (oldIdx !== undefined && oldWords[oldIdx].chord) {
          return { ...token, chord: oldWords[oldIdx].chord };
        }
        return token;
      }),
    }));

    const updatedSections = song.sections.map(sec =>
      sec.id !== sectionId ? sec : { ...sec, lines: restoredLines }
    );
    commit({
      ...song,
      language: detectLanguage(updatedSections),
      sections: updatedSections,
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
