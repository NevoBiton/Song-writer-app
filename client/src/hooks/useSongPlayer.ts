import { useState, useCallback, useRef, useEffect } from 'react';
import * as Tone from 'tone';
import { Song } from '../types';
import { chordsToNotes } from '../utils/chordToNotes';
import { scheduleSong, getTotalDuration, ChordEvent } from '../utils/songScheduler';

export type PlayerState = 'stopped' | 'playing' | 'paused';
export type InstrumentType = 'piano' | 'guitar' | 'organ' | 'strings' | 'synth';

export const INSTRUMENT_LABELS: Record<InstrumentType, string> = {
  piano: 'Piano',
  guitar: 'Guitar',
  organ: 'Organ',
  strings: 'Strings',
  synth: 'Synth',
};

const BEATS_PER_CHORD = 2;
/** Seconds between each note in a guitar strum */
const STRUM_DELAY_S = 0.018;

// ---------------------------------------------------------------------------
// InstrumentPlayer abstraction
// ---------------------------------------------------------------------------

interface InstrumentPlayer {
  playChord(notes: string[], duration: number, time: number): void;
  releaseAll(): void;
  dispose(): void;
}

function makeSamplerPlayer(sampler: Tone.Sampler): InstrumentPlayer {
  return {
    playChord(notes, duration, time) {
      sampler.triggerAttackRelease(notes, duration, time);
    },
    releaseAll() { sampler.releaseAll(); },
    dispose() { sampler.dispose(); },
  };
}

// ---------------------------------------------------------------------------
// Piano — Salamander-quality recorded samples
// ---------------------------------------------------------------------------

async function makePianoSampler(): Promise<InstrumentPlayer> {
  const sampler = new Tone.Sampler({
    urls: {
      A2: 'A2.mp3',   C3: 'C3.mp3',  'D#3': 'Ds3.mp3', 'F#3': 'Fs3.mp3',
      A3: 'A3.mp3',   C4: 'C4.mp3',  'D#4': 'Ds4.mp3', 'F#4': 'Fs4.mp3',
      A4: 'A4.mp3',   C5: 'C5.mp3',  'D#5': 'Ds5.mp3', 'F#5': 'Fs5.mp3',
    },
    release: 1.5,
    baseUrl: 'https://nbrosowsky.github.io/tonejs-instruments/samples/piano/',
  }).toDestination();
  await Tone.loaded();
  return makeSamplerPlayer(sampler);
}

// ---------------------------------------------------------------------------
// Guitar — nylon-string acoustic samples, strummed
// ---------------------------------------------------------------------------

async function makeGuitarSampler(): Promise<InstrumentPlayer> {
  const sampler = new Tone.Sampler({
    urls: {
      B1: 'B1.mp3', E2: 'E2.mp3', A2: 'A2.mp3',
      D3: 'D3.mp3', G3: 'G3.mp3', B3: 'B3.mp3',
      E4: 'E4.mp3', A4: 'A4.mp3',
    },
    release: 2,
    baseUrl: 'https://nbrosowsky.github.io/tonejs-instruments/samples/guitar-nylon/',
  }).toDestination();
  await Tone.loaded();

  // Guitar strums one note at a time with a small delay
  return {
    playChord(notes, duration, time) {
      notes.forEach((note, i) => {
        sampler.triggerAttackRelease(note, duration, time + i * STRUM_DELAY_S);
      });
    },
    releaseAll() { sampler.releaseAll(); },
    dispose() { sampler.dispose(); },
  };
}

// ---------------------------------------------------------------------------
// Organ — pipe organ recorded samples
// ---------------------------------------------------------------------------

async function makeOrganSampler(): Promise<InstrumentPlayer> {
  const sampler = new Tone.Sampler({
    urls: {
      C3: 'C3.mp3',  'D#3': 'Ds3.mp3', 'F#3': 'Fs3.mp3',
      A3: 'A3.mp3',   C4: 'C4.mp3',  'D#4': 'Ds4.mp3',
      'F#4': 'Fs4.mp3', A4: 'A4.mp3',   C5: 'C5.mp3',
    },
    release: 0.3,
    baseUrl: 'https://nbrosowsky.github.io/tonejs-instruments/samples/organ/',
  }).toDestination();
  await Tone.loaded();
  return makeSamplerPlayer(sampler);
}

// ---------------------------------------------------------------------------
// Strings — violin recorded samples with reverb
// ---------------------------------------------------------------------------

async function makeStringsSampler(): Promise<InstrumentPlayer> {
  const reverb = new Tone.Reverb({ decay: 2.5, wet: 0.35 }).toDestination();
  const sampler = new Tone.Sampler({
    urls: {
      G3: 'G3.mp3', A3: 'A3.mp3', C4: 'C4.mp3',
      E4: 'E4.mp3', G4: 'G4.mp3', A4: 'A4.mp3',
      C5: 'C5.mp3', E5: 'E5.mp3',
    },
    release: 2,
    baseUrl: 'https://nbrosowsky.github.io/tonejs-instruments/samples/violin/',
  }).connect(reverb);
  await Tone.loaded();

  return {
    playChord(notes, duration, time) {
      sampler.triggerAttackRelease(notes, duration, time);
    },
    releaseAll() { sampler.releaseAll(); },
    dispose() { sampler.dispose(); reverb.dispose(); },
  };
}

// ---------------------------------------------------------------------------
// Synth — FMSynth (intentionally electronic, no samples needed)
// ---------------------------------------------------------------------------

function makeSynthPlayer(): InstrumentPlayer {
  const synth = new Tone.PolySynth(Tone.FMSynth).toDestination();
  synth.set({
    harmonicity: 3,
    modulationIndex: 10,
    oscillator: { type: 'sine' as const },
    envelope: { attack: 0.01, decay: 0.2, sustain: 0.5, release: 1.0 },
    modulation: { type: 'triangle' as const },
    modulationEnvelope: { attack: 0.35, decay: 0.01, sustain: 1, release: 0.5 },
    volume: -4,
  });

  return {
    playChord(notes, duration, time) { synth.triggerAttackRelease(notes, duration, time); },
    releaseAll() { synth.releaseAll(); },
    dispose() { synth.dispose(); },
  };
}

// ---------------------------------------------------------------------------
// Factory — returns a ready-to-use InstrumentPlayer
// ---------------------------------------------------------------------------

async function makeInstrument(type: InstrumentType): Promise<InstrumentPlayer> {
  switch (type) {
    case 'guitar':  return makeGuitarSampler();
    case 'piano':   return makePianoSampler();
    case 'organ':   return makeOrganSampler();
    case 'strings': return makeStringsSampler();
    default:        return makeSynthPlayer();
  }
}

// ---------------------------------------------------------------------------
// useSongPlayer hook
// ---------------------------------------------------------------------------

export function useSongPlayer(song: Song, initialBpm?: number) {
  const [playerState, setPlayerState] = useState<PlayerState>('stopped');
  const [activeTokenId, setActiveTokenId] = useState<string | null>(null);
  const [bpm, _setBpm] = useState(initialBpm ?? song.bpm ?? 80);
  const [instrument, _setInstrument] = useState<InstrumentType>('piano');
  const [isLoading, setIsLoading] = useState(false);

  const instrumentPlayerRef = useRef<InstrumentPlayer | null>(null);
  const partRef = useRef<Tone.Part | null>(null);
  const eventsRef = useRef<ChordEvent[]>([]);
  const totalDurRef = useRef(0);
  const bpmRef = useRef(bpm);
  const instrumentRef = useRef<InstrumentType>('piano');

  useEffect(() => { bpmRef.current = bpm; }, [bpm]);
  useEffect(() => { instrumentRef.current = instrument; }, [instrument]);

  const cleanupPlayback = useCallback(() => {
    const transport = Tone.getTransport();
    transport.stop();
    transport.cancel();
    partRef.current?.dispose();
    partRef.current = null;
    try { instrumentPlayerRef.current?.releaseAll(); } catch { /* ignore */ }
  }, []);

  // Dispose audio nodes on unmount
  useEffect(() => {
    return () => {
      cleanupPlayback();
      instrumentPlayerRef.current?.dispose();
      instrumentPlayerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Poll transport: update active chord highlight and detect song end
  useEffect(() => {
    if (playerState !== 'playing') return;

    const id = setInterval(() => {
      const transport = Tone.getTransport();
      const now = transport.seconds;
      const events = eventsRef.current;
      const total = totalDurRef.current;

      let found: string | null = null;
      for (const ev of events) {
        if (ev.time <= now) found = ev.tokenId;
        else break;
      }
      setActiveTokenId(found);

      if (total > 0 && now >= total) {
        transport.stop();
        transport.cancel();
        setPlayerState('stopped');
        setActiveTokenId(null);
      }
    }, 100);

    return () => clearInterval(id);
  }, [playerState]);

  const play = useCallback(async () => {
    await Tone.start();
    cleanupPlayback();

    const events = scheduleSong(song, bpmRef.current, BEATS_PER_CHORD);
    if (!events.length) return;

    // Load samples if not already cached for this instrument
    if (!instrumentPlayerRef.current) {
      setIsLoading(true);
      try {
        instrumentPlayerRef.current = await makeInstrument(instrumentRef.current);
      } catch (err) {
        console.error('Failed to load instrument samples:', err);
        setIsLoading(false);
        return;
      }
      setIsLoading(false);
    }

    eventsRef.current = events;
    totalDurRef.current = getTotalDuration(events, bpmRef.current, BEATS_PER_CHORD);

    const transport = Tone.getTransport();
    transport.bpm.value = bpmRef.current;

    const noteDur = (60 / bpmRef.current) * BEATS_PER_CHORD * 0.85;
    const player = instrumentPlayerRef.current;

    const part = new Tone.Part(
      (time: number, ev: unknown) => {
        const event = ev as ChordEvent;
        const notes = chordsToNotes(event.chords);
        if (notes.length && player) {
          player.playChord(notes, noteDur, time);
        }
      },
      events.map(ev => [ev.time, ev]),
    );

    part.start(0);
    partRef.current = part;

    transport.start('+0.05');
    setPlayerState('playing');
  }, [song, cleanupPlayback]);

  const pause = useCallback(() => {
    Tone.getTransport().pause();
    try { instrumentPlayerRef.current?.releaseAll(); } catch { /* ignore */ }
    setPlayerState('paused');
  }, []);

  const stop = useCallback(() => {
    cleanupPlayback();
    setPlayerState('stopped');
    setActiveTokenId(null);
  }, [cleanupPlayback]);

  const resume = useCallback(async () => {
    await Tone.start();
    Tone.getTransport().start();
    setPlayerState('playing');
  }, []);

  const setBpm = useCallback((newBpm: number) => {
    _setBpm(newBpm);
    bpmRef.current = newBpm;
    Tone.getTransport().bpm.value = newBpm;
  }, []);

  const setInstrument = useCallback((type: InstrumentType) => {
    _setInstrument(type);
    instrumentRef.current = type;
    // Dispose old instrument so next play loads the new one
    instrumentPlayerRef.current?.dispose();
    instrumentPlayerRef.current = null;
  }, []);

  const events = scheduleSong(song, bpm, BEATS_PER_CHORD);

  return {
    playerState,
    activeTokenId,
    bpm,
    setBpm,
    instrument,
    setInstrument,
    isLoading,
    play,
    pause,
    stop,
    resume,
    hasChords: events.length > 0,
    totalChords: events.length,
  };
}
