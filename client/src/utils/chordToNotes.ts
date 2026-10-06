import { Chord } from 'tonal';

const CHROMATIC: Record<string, number> = {
  C: 0, 'C#': 1, Db: 1, D: 2, 'D#': 3, Eb: 3,
  E: 4, F: 5, 'F#': 6, Gb: 6, G: 7, 'G#': 8,
  Ab: 8, A: 9, 'A#': 10, Bb: 10, B: 11, Cb: 11,
};

function chromaticIdx(note: string): number {
  // Try exact match first, then strip accidentals for fallback
  if (note in CHROMATIC) return CHROMATIC[note];
  return CHROMATIC[note[0]] ?? 0;
}

/**
 * Convert a chord name (e.g. "Am", "G#dim7") to Tone.js note strings with octaves.
 * Example: "Am" → ["A3", "C4", "E4"]
 */
export function chordToNotes(chordName: string, rootOctave = 3): string[] {
  const chord = Chord.get(chordName.trim());
  if (!chord.notes?.length) return [];

  const result: string[] = [];
  let octave = rootOctave;
  let prevIdx = -1;

  for (const note of chord.notes) {
    const idx = chromaticIdx(note);
    if (prevIdx !== -1 && idx <= prevIdx) octave++;
    result.push(`${note}${octave}`);
    prevIdx = idx;
  }

  return result;
}

/** Flatten multiple chord names to a deduplicated list of Tone.js note strings */
export function chordsToNotes(chordNames: string[], rootOctave = 3): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const name of chordNames) {
    for (const note of chordToNotes(name, rootOctave)) {
      if (!seen.has(note)) {
        seen.add(note);
        result.push(note);
      }
    }
  }
  return result;
}
