import { Song } from '../types';

export interface ChordEvent {
  time: number;      // seconds from song start
  chords: string[];
  tokenId: string;
  sectionId: string;
  lineId: string;
}

/**
 * Flatten a song's chord tokens into a sequence of timed events.
 * Each token that has chords occupies beatsPerChord beats.
 */
export function scheduleSong(
  song: Song,
  bpm: number,
  beatsPerChord = 2,
): ChordEvent[] {
  const spb = 60 / bpm; // seconds per beat
  const events: ChordEvent[] = [];
  let t = 0;

  for (const section of song.sections) {
    for (const line of section.lines) {
      for (const token of line.tokens) {
        if (!token.isSpace && token.chords?.length) {
          events.push({
            time: t,
            chords: token.chords,
            tokenId: token.id,
            sectionId: section.id,
            lineId: line.id,
          });
          t += spb * beatsPerChord;
        }
      }
    }
  }

  return events;
}

export function getTotalDuration(
  events: ChordEvent[],
  bpm: number,
  beatsPerChord = 2,
): number {
  if (!events.length) return 0;
  return events[events.length - 1].time + (60 / bpm) * beatsPerChord;
}
