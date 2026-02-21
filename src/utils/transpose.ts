import { Song } from '../types';

const SHARP_NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const FLAT_NOTES  = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];

const ENHARMONIC: Record<string, string> = {
  'C#': 'Db', 'Db': 'C#',
  'D#': 'Eb', 'Eb': 'D#',
  'F#': 'Gb', 'Gb': 'F#',
  'G#': 'Ab', 'Ab': 'G#',
  'A#': 'Bb', 'Bb': 'A#',
};

function noteIndex(note: string): number {
  const si = SHARP_NOTES.indexOf(note);
  if (si >= 0) return si;
  const fi = FLAT_NOTES.indexOf(note);
  return fi;
}

function preferFlats(root: string): boolean {
  return ['F', 'Bb', 'Eb', 'Ab', 'Db', 'Gb'].includes(root);
}

function transposeNote(note: string, semitones: number): string {
  const idx = noteIndex(note);
  if (idx < 0) return note;
  const newIdx = ((idx + semitones) % 12 + 12) % 12;
  const useFlats = preferFlats(note) !== (semitones < 0);
  return useFlats ? FLAT_NOTES[newIdx] : SHARP_NOTES[newIdx];
}

function parseChordName(chord: string): { root: string; quality: string; bass?: string } | null {
  // Match root (with optional sharp/flat), quality, optional slash bass
  const match = chord.match(/^([A-G][#b]?)(.*?)(?:\/([A-G][#b]?))?$/);
  if (!match) return null;
  return {
    root: match[1],
    quality: match[2] || '',
    bass: match[3],
  };
}

export function transposeChord(chord: string, semitones: number): string {
  if (!chord || semitones === 0) return chord;
  const parsed = parseChordName(chord);
  if (!parsed) return chord;

  const newRoot = transposeNote(parsed.root, semitones);
  const newBass = parsed.bass ? transposeNote(parsed.bass, semitones) : undefined;

  return newBass
    ? `${newRoot}${parsed.quality}/${newBass}`
    : `${newRoot}${parsed.quality}`;
}

export function transposeSong(song: Song, semitones: number): Song {
  return {
    ...song,
    key: song.key ? transposeChord(song.key, semitones) : undefined,
    sections: song.sections.map(section => ({
      ...section,
      lines: section.lines.map(line => ({
        ...line,
        tokens: line.tokens.map(token => ({
          ...token,
          chord: token.chord ? transposeChord(token.chord, semitones) : undefined,
        })),
      })),
    })),
  };
}

export function getCapoPosition(fromKey: string, toKey: string): number {
  const fromIdx = noteIndex(fromKey);
  const toIdx = noteIndex(toKey);
  if (fromIdx < 0 || toIdx < 0) return 0;
  return ((toIdx - fromIdx) + 12) % 12;
}

export function getAllKeys(): string[] {
  return [
    'C', 'G', 'D', 'A', 'E', 'B', 'F#', 'Db',
    'Ab', 'Eb', 'Bb', 'F',
    'Am', 'Em', 'Bm', 'F#m', 'C#m', 'G#m', 'D#m', 'Bbm',
    'Fm', 'Cm', 'Gm', 'Dm',
  ];
}

// Get enharmonic equivalent
export function enharmonic(note: string): string {
  return ENHARMONIC[note] || note;
}
