// Type declarations for packages that ship broken/missing .d.ts files

declare module 'tonal' {
  interface ChordType {
    empty: boolean;
    name: string;
    quality: 'Major' | 'Minor' | 'Augmented' | 'Diminished' | 'Unknown' | 'Other';
    aliases: string[];
    intervals: string[];
    /** Pitch classes without octave, e.g. ["A", "C", "E"] */
    notes: string[];
  }

  const Chord: {
    /** Get chord info by name, e.g. Chord.get("Am") */
    get(chord: string): ChordType;
    /** Detect possible chord names from an array of notes */
    detect(notes: string[]): string[];
  };

  const Note: {
    midi(note: string): number | null;
    freq(note: string): number | null;
    transpose(note: string, interval: string): string;
  };

  const Scale: {
    get(name: string): { notes: string[]; name: string; empty: boolean };
  };

  export { Chord, Note, Scale };
}
