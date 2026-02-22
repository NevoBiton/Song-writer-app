import { ChordDefinition } from '../types';

// fingers array: [e, B, G, D, A, E] (high to low string)
// -1 = muted, 0 = open, 1-N = fret number

export const CHORD_LIBRARY: Record<string, ChordDefinition> = {
  // ─── C root ───────────────────────────────────────────────────────────
  C:      { name: 'C',      root: 'C', quality: 'major', fingers: [0,1,0,2,3,-1], baseFret: 1 },
  Cm:     { name: 'Cm',     root: 'C', quality: 'm',     fingers: [3,4,5,5,3,3], baseFret: 3, barres: [3] },
  C7:     { name: 'C7',     root: 'C', quality: '7',     fingers: [0,1,3,2,3,-1], baseFret: 1 },
  Cmaj7:  { name: 'Cmaj7',  root: 'C', quality: 'maj7',  fingers: [0,0,0,2,3,-1], baseFret: 1 },
  Cm7:    { name: 'Cm7',    root: 'C', quality: 'm7',    fingers: [3,4,3,5,3,3], baseFret: 3, barres: [3] },
  Csus2:  { name: 'Csus2',  root: 'C', quality: 'sus2',  fingers: [3,3,0,0,3,-1], baseFret: 1 },
  Csus4:  { name: 'Csus4',  root: 'C', quality: 'sus4',  fingers: [1,1,0,3,3,-1], baseFret: 1 },
  Cadd9:  { name: 'Cadd9',  root: 'C', quality: 'add9',  fingers: [3,3,0,2,3,-1], baseFret: 1 },
  Cdim:   { name: 'Cdim',   root: 'C', quality: 'dim',   fingers: [2,4,2,4,3,-1], baseFret: 1 },
  Caug:   { name: 'Caug',   root: 'C', quality: 'aug',   fingers: [1,1,1,2,3,-1], baseFret: 1 },
  C6:     { name: 'C6',     root: 'C', quality: '6',     fingers: [0,1,2,2,3,-1], baseFret: 1 },
  Cm6:    { name: 'Cm6',    root: 'C', quality: 'm6',    fingers: [1,1,2,3,3,-1], baseFret: 1 },
  C9:     { name: 'C9',     root: 'C', quality: '9',     fingers: [3,3,2,2,3,-1], baseFret: 1 },
  Cm9:    { name: 'Cm9',    root: 'C', quality: 'm9',    fingers: [3,4,3,3,3,3], baseFret: 3, barres: [3] },
  C11:    { name: 'C11',    root: 'C', quality: '11',    fingers: [1,3,3,2,3,-1], baseFret: 1 },
  C13:    { name: 'C13',    root: 'C', quality: '13',    fingers: [2,3,3,2,3,-1], baseFret: 1 },
  C5:     { name: 'C5',     root: 'C', quality: '5',     fingers: [-1,-1,5,5,3,-1], baseFret: 1 },
  'C/E':  { name: 'C/E',   root: 'C', quality: 'major', fingers: [0,1,0,2,3,0], baseFret: 1 },
  'C/G':  { name: 'C/G',   root: 'C', quality: 'major', fingers: [0,1,0,2,3,3], baseFret: 1 },
  'C/B':  { name: 'C/B',   root: 'C', quality: 'major', fingers: [0,1,0,2,3,2], baseFret: 1 },

  // ─── C# / Db root ───────────────────────────────────────────────────
  'C#':     { name: 'C#',     root: 'C#', quality: 'major', fingers: [4,4,3,3,4,4], baseFret: 4, barres: [4] },
  Db:       { name: 'Db',     root: 'Db', quality: 'major', fingers: [4,4,3,3,4,4], baseFret: 4, barres: [4] },
  'C#m':    { name: 'C#m',    root: 'C#', quality: 'm',     fingers: [4,5,6,6,4,4], baseFret: 4, barres: [4] },
  Dbm:      { name: 'Dbm',    root: 'Db', quality: 'm',     fingers: [4,5,6,6,4,4], baseFret: 4, barres: [4] },
  'C#7':    { name: 'C#7',    root: 'C#', quality: '7',     fingers: [4,4,3,5,4,4], baseFret: 4, barres: [4] },
  'C#maj7': { name: 'C#maj7', root: 'C#', quality: 'maj7',  fingers: [4,4,3,5,4,4], baseFret: 4, barres: [4] },
  'C#m7':   { name: 'C#m7',   root: 'C#', quality: 'm7',    fingers: [4,4,3,4,4,4], baseFret: 4, barres: [4] },
  'C#sus2': { name: 'C#sus2', root: 'C#', quality: 'sus2',  fingers: [4,4,1,1,4,4], baseFret: 4, barres: [4] },
  'C#sus4': { name: 'C#sus4', root: 'C#', quality: 'sus4',  fingers: [4,4,4,3,4,4], baseFret: 4, barres: [4] },
  'C#dim':  { name: 'C#dim',  root: 'C#', quality: 'dim',   fingers: [2,1,2,1,-1,-1], baseFret: 1 },
  'C#aug':  { name: 'C#aug',  root: 'C#', quality: 'aug',   fingers: [2,2,2,3,4,-1], baseFret: 1 },
  'C#5':    { name: 'C#5',    root: 'C#', quality: '5',     fingers: [-1,-1,6,6,4,-1], baseFret: 1 },

  // ─── D root ────────────────────────────────────────────────────────
  D:      { name: 'D',      root: 'D', quality: 'major', fingers: [2,3,2,0,-1,-1], baseFret: 1 },
  Dm:     { name: 'Dm',     root: 'D', quality: 'm',     fingers: [1,3,2,0,-1,-1], baseFret: 1 },
  D7:     { name: 'D7',     root: 'D', quality: '7',     fingers: [2,1,2,0,-1,-1], baseFret: 1 },
  Dmaj7:  { name: 'Dmaj7',  root: 'D', quality: 'maj7',  fingers: [2,2,2,0,-1,-1], baseFret: 1 },
  Dm7:    { name: 'Dm7',    root: 'D', quality: 'm7',    fingers: [1,1,2,0,-1,-1], baseFret: 1 },
  Dsus2:  { name: 'Dsus2',  root: 'D', quality: 'sus2',  fingers: [0,3,2,0,-1,-1], baseFret: 1 },
  Dsus4:  { name: 'Dsus4',  root: 'D', quality: 'sus4',  fingers: [3,3,2,0,-1,-1], baseFret: 1 },
  Dadd9:  { name: 'Dadd9',  root: 'D', quality: 'add9',  fingers: [0,3,2,0,-1,-1], baseFret: 1 },
  Ddim:   { name: 'Ddim',   root: 'D', quality: 'dim',   fingers: [1,3,1,0,-1,-1], baseFret: 1 },
  Daug:   { name: 'Daug',   root: 'D', quality: 'aug',   fingers: [3,3,2,0,-1,-1], baseFret: 1 },
  D6:     { name: 'D6',     root: 'D', quality: '6',     fingers: [2,0,2,0,-1,-1], baseFret: 1 },
  Dm6:    { name: 'Dm6',    root: 'D', quality: 'm6',    fingers: [2,0,1,0,-1,-1], baseFret: 1 },
  D9:     { name: 'D9',     root: 'D', quality: '9',     fingers: [2,1,2,0,0,-1], baseFret: 1 },
  Dm9:    { name: 'Dm9',    root: 'D', quality: 'm9',    fingers: [1,1,0,0,-1,-1], baseFret: 1 },
  D11:    { name: 'D11',    root: 'D', quality: '11',    fingers: [0,1,0,0,-1,-1], baseFret: 1 },
  D13:    { name: 'D13',    root: 'D', quality: '13',    fingers: [2,0,2,0,0,-1], baseFret: 1 },
  D5:     { name: 'D5',     root: 'D', quality: '5',     fingers: [-1,-1,7,7,5,-1], baseFret: 1 },
  'D/F#': { name: 'D/F#',  root: 'D', quality: 'major', fingers: [2,3,2,0,-1,2], baseFret: 1 },
  'D/A':  { name: 'D/A',   root: 'D', quality: 'major', fingers: [2,3,2,0,0,-1], baseFret: 1 },

  // ─── D# / Eb root ───────────────────────────────────────────────────
  'D#':     { name: 'D#',     root: 'D#', quality: 'major', fingers: [6,6,5,5,6,6], baseFret: 6, barres: [6] },
  Eb:       { name: 'Eb',     root: 'Eb', quality: 'major', fingers: [6,6,5,5,6,6], baseFret: 6, barres: [6] },
  'D#m':    { name: 'D#m',    root: 'D#', quality: 'm',     fingers: [6,7,8,8,6,6], baseFret: 6, barres: [6] },
  Ebm:      { name: 'Ebm',    root: 'Eb', quality: 'm',     fingers: [6,7,8,8,6,6], baseFret: 6, barres: [6] },
  'D#7':    { name: 'D#7',    root: 'D#', quality: '7',     fingers: [6,6,5,7,6,6], baseFret: 6, barres: [6] },
  'D#maj7': { name: 'D#maj7', root: 'D#', quality: 'maj7',  fingers: [6,6,5,7,6,6], baseFret: 6, barres: [6] },
  'D#m7':   { name: 'D#m7',   root: 'D#', quality: 'm7',    fingers: [6,6,5,6,6,6], baseFret: 6, barres: [6] },
  'D#sus2': { name: 'D#sus2', root: 'D#', quality: 'sus2',  fingers: [6,6,3,3,6,6], baseFret: 6, barres: [6] },
  'D#dim':  { name: 'D#dim',  root: 'D#', quality: 'dim',   fingers: [3,2,3,2,-1,-1], baseFret: 1 },
  'D#aug':  { name: 'D#aug',  root: 'D#', quality: 'aug',   fingers: [4,4,3,1,-1,-1], baseFret: 1 },
  'D#5':    { name: 'D#5',    root: 'D#', quality: '5',     fingers: [-1,-1,8,8,6,-1], baseFret: 1 },
  Eb7:      { name: 'Eb7',    root: 'Eb', quality: '7',     fingers: [6,6,5,7,6,6], baseFret: 6, barres: [6] },
  Ebmaj7:   { name: 'Ebmaj7', root: 'Eb', quality: 'maj7',  fingers: [6,6,5,7,6,6], baseFret: 6, barres: [6] },

  // ─── E root ────────────────────────────────────────────────────────
  E:      { name: 'E',      root: 'E', quality: 'major', fingers: [0,0,1,2,2,0], baseFret: 1 },
  Em:     { name: 'Em',     root: 'E', quality: 'm',     fingers: [0,0,0,2,2,0], baseFret: 1 },
  E7:     { name: 'E7',     root: 'E', quality: '7',     fingers: [0,0,1,0,2,0], baseFret: 1 },
  Emaj7:  { name: 'Emaj7',  root: 'E', quality: 'maj7',  fingers: [0,0,1,1,2,0], baseFret: 1 },
  Em7:    { name: 'Em7',    root: 'E', quality: 'm7',    fingers: [0,0,0,0,2,0], baseFret: 1 },
  Esus2:  { name: 'Esus2',  root: 'E', quality: 'sus2',  fingers: [0,0,2,2,2,0], baseFret: 1 },
  Esus4:  { name: 'Esus4',  root: 'E', quality: 'sus4',  fingers: [0,0,2,2,2,0], baseFret: 1 },
  Eadd9:  { name: 'Eadd9',  root: 'E', quality: 'add9',  fingers: [0,0,2,4,2,0], baseFret: 1 },
  Edim:   { name: 'Edim',   root: 'E', quality: 'dim',   fingers: [0,3,1,2,-1,-1], baseFret: 1 },
  Eaug:   { name: 'Eaug',   root: 'E', quality: 'aug',   fingers: [0,1,1,2,3,-1], baseFret: 1 },
  E6:     { name: 'E6',     root: 'E', quality: '6',     fingers: [0,2,1,2,2,0], baseFret: 1 },
  Em6:    { name: 'Em6',    root: 'E', quality: 'm6',    fingers: [0,2,0,2,2,0], baseFret: 1 },
  E9:     { name: 'E9',     root: 'E', quality: '9',     fingers: [0,0,1,0,0,0], baseFret: 1 },
  Em9:    { name: 'Em9',    root: 'E', quality: 'm9',    fingers: [0,0,0,0,0,0], baseFret: 1 },
  E11:    { name: 'E11',    root: 'E', quality: '11',    fingers: [0,0,0,2,2,0], baseFret: 1 },
  E13:    { name: 'E13',    root: 'E', quality: '13',    fingers: [0,2,1,0,2,0], baseFret: 1 },
  E5:     { name: 'E5',     root: 'E', quality: '5',     fingers: [-1,-1,-1,2,2,0], baseFret: 1 },
  'E/B':  { name: 'E/B',   root: 'E', quality: 'major', fingers: [0,0,1,2,2,2], baseFret: 1 },
  'E/G#': { name: 'E/G#',  root: 'E', quality: 'major', fingers: [0,0,1,2,2,4], baseFret: 1 },

  // ─── F root ────────────────────────────────────────────────────────
  F:      { name: 'F',      root: 'F', quality: 'major', fingers: [1,1,2,3,3,1], baseFret: 1, barres: [1] },
  Fm:     { name: 'Fm',     root: 'F', quality: 'm',     fingers: [1,1,1,3,3,1], baseFret: 1, barres: [1] },
  F7:     { name: 'F7',     root: 'F', quality: '7',     fingers: [1,1,2,1,3,1], baseFret: 1, barres: [1] },
  Fmaj7:  { name: 'Fmaj7',  root: 'F', quality: 'maj7',  fingers: [1,1,2,3,3,0], baseFret: 1 },
  Fm7:    { name: 'Fm7',    root: 'F', quality: 'm7',    fingers: [1,1,1,1,3,1], baseFret: 1, barres: [1] },
  Fsus2:  { name: 'Fsus2',  root: 'F', quality: 'sus2',  fingers: [1,1,3,3,1,1], baseFret: 1, barres: [1] },
  Fsus4:  { name: 'Fsus4',  root: 'F', quality: 'sus4',  fingers: [1,1,3,3,3,1], baseFret: 1, barres: [1] },
  Fadd9:  { name: 'Fadd9',  root: 'F', quality: 'add9',  fingers: [1,1,0,3,3,1], baseFret: 1, barres: [1] },
  Fdim:   { name: 'Fdim',   root: 'F', quality: 'dim',   fingers: [1,2,1,2,-1,-1], baseFret: 1 },
  Faug:   { name: 'Faug',   root: 'F', quality: 'aug',   fingers: [2,1,1,2,3,-1], baseFret: 1 },
  F6:     { name: 'F6',     root: 'F', quality: '6',     fingers: [1,3,2,3,3,1], baseFret: 1, barres: [1] },
  Fm6:    { name: 'Fm6',    root: 'F', quality: 'm6',    fingers: [1,3,1,3,3,1], baseFret: 1, barres: [1] },
  F9:     { name: 'F9',     root: 'F', quality: '9',     fingers: [1,1,2,1,1,1], baseFret: 1, barres: [1] },
  F11:    { name: 'F11',    root: 'F', quality: '11',    fingers: [1,1,1,3,3,1], baseFret: 1, barres: [1] },
  F5:     { name: 'F5',     root: 'F', quality: '5',     fingers: [-1,-1,-1,3,3,1], baseFret: 1 },
  'F/A':  { name: 'F/A',   root: 'F', quality: 'major', fingers: [1,1,2,3,0,0], baseFret: 1 },
  'F/C':  { name: 'F/C',   root: 'F', quality: 'major', fingers: [1,1,2,3,3,0], baseFret: 1 },

  // ─── F# / Gb root ───────────────────────────────────────────────────
  'F#':     { name: 'F#',     root: 'F#', quality: 'major', fingers: [2,2,3,4,4,2], baseFret: 2, barres: [2] },
  Gb:       { name: 'Gb',     root: 'Gb', quality: 'major', fingers: [2,2,3,4,4,2], baseFret: 2, barres: [2] },
  'F#m':    { name: 'F#m',    root: 'F#', quality: 'm',     fingers: [2,2,2,4,4,2], baseFret: 2, barres: [2] },
  'F#7':    { name: 'F#7',    root: 'F#', quality: '7',     fingers: [2,2,3,2,4,2], baseFret: 2, barres: [2] },
  'F#maj7': { name: 'F#maj7', root: 'F#', quality: 'maj7',  fingers: [2,2,3,4,4,1], baseFret: 1 },
  'F#m7':   { name: 'F#m7',   root: 'F#', quality: 'm7',    fingers: [2,2,2,2,4,2], baseFret: 2, barres: [2] },
  'F#sus2': { name: 'F#sus2', root: 'F#', quality: 'sus2',  fingers: [2,2,4,4,2,2], baseFret: 2, barres: [2] },
  'F#sus4': { name: 'F#sus4', root: 'F#', quality: 'sus4',  fingers: [2,2,4,4,4,2], baseFret: 2, barres: [2] },
  'F#dim':  { name: 'F#dim',  root: 'F#', quality: 'dim',   fingers: [2,3,2,3,-1,-1], baseFret: 1 },
  'F#aug':  { name: 'F#aug',  root: 'F#', quality: 'aug',   fingers: [3,2,2,3,4,-1], baseFret: 1 },
  'F#5':    { name: 'F#5',    root: 'F#', quality: '5',     fingers: [-1,-1,-1,4,4,2], baseFret: 1 },
  'F#m6':   { name: 'F#m6',   root: 'F#', quality: 'm6',    fingers: [2,4,2,4,4,2], baseFret: 2, barres: [2] },
  'F#9':    { name: 'F#9',    root: 'F#', quality: '9',     fingers: [2,2,3,2,2,2], baseFret: 2, barres: [2] },

  // ─── G root ────────────────────────────────────────────────────────
  G:      { name: 'G',      root: 'G', quality: 'major', fingers: [3,0,0,0,2,3], baseFret: 1 },
  Gm:     { name: 'Gm',     root: 'G', quality: 'm',     fingers: [3,3,3,5,5,3], baseFret: 3, barres: [3] },
  G7:     { name: 'G7',     root: 'G', quality: '7',     fingers: [1,0,0,0,2,3], baseFret: 1 },
  Gmaj7:  { name: 'Gmaj7',  root: 'G', quality: 'maj7',  fingers: [2,0,0,0,2,3], baseFret: 1 },
  Gm7:    { name: 'Gm7',    root: 'G', quality: 'm7',    fingers: [3,3,3,3,5,3], baseFret: 3, barres: [3] },
  Gsus2:  { name: 'Gsus2',  root: 'G', quality: 'sus2',  fingers: [3,0,0,0,0,3], baseFret: 1 },
  Gsus4:  { name: 'Gsus4',  root: 'G', quality: 'sus4',  fingers: [3,1,0,0,2,3], baseFret: 1 },
  Gadd9:  { name: 'Gadd9',  root: 'G', quality: 'add9',  fingers: [3,0,2,0,2,3], baseFret: 1 },
  Gdim:   { name: 'Gdim',   root: 'G', quality: 'dim',   fingers: [3,4,3,4,-1,-1], baseFret: 1 },
  Gaug:   { name: 'Gaug',   root: 'G', quality: 'aug',   fingers: [3,3,3,1,2,-1], baseFret: 1 },
  G6:     { name: 'G6',     root: 'G', quality: '6',     fingers: [0,0,0,0,2,3], baseFret: 1 },
  Gm6:    { name: 'Gm6',    root: 'G', quality: 'm6',    fingers: [0,3,3,5,5,3], baseFret: 3, barres: [3] },
  G9:     { name: 'G9',     root: 'G', quality: '9',     fingers: [0,2,0,0,0,3], baseFret: 1 },
  Gm9:    { name: 'Gm9',    root: 'G', quality: 'm9',    fingers: [3,3,3,3,5,3], baseFret: 3, barres: [3] },
  G11:    { name: 'G11',    root: 'G', quality: '11',    fingers: [1,0,3,0,2,3], baseFret: 1 },
  G13:    { name: 'G13',    root: 'G', quality: '13',    fingers: [0,0,0,0,2,3], baseFret: 1 },
  G5:     { name: 'G5',     root: 'G', quality: '5',     fingers: [-1,-1,-1,5,5,3], baseFret: 1 },
  'G/B':  { name: 'G/B',   root: 'G', quality: 'major', fingers: [3,0,0,0,0,2], baseFret: 1 },
  'G/D':  { name: 'G/D',   root: 'G', quality: 'major', fingers: [3,0,0,0,0,0], baseFret: 1 },
  'G/F#': { name: 'G/F#',  root: 'G', quality: 'major', fingers: [3,0,0,0,2,2], baseFret: 1 },

  // ─── G# / Ab root ───────────────────────────────────────────────────
  'G#':     { name: 'G#',     root: 'G#', quality: 'major', fingers: [4,4,5,6,6,4], baseFret: 4, barres: [4] },
  Ab:       { name: 'Ab',     root: 'Ab', quality: 'major', fingers: [4,4,5,6,6,4], baseFret: 4, barres: [4] },
  'G#m':    { name: 'G#m',    root: 'G#', quality: 'm',     fingers: [4,4,4,6,6,4], baseFret: 4, barres: [4] },
  Abm:      { name: 'Abm',    root: 'Ab', quality: 'm',     fingers: [4,4,4,6,6,4], baseFret: 4, barres: [4] },
  'G#7':    { name: 'G#7',    root: 'G#', quality: '7',     fingers: [4,4,5,4,6,4], baseFret: 4, barres: [4] },
  'G#maj7': { name: 'G#maj7', root: 'G#', quality: 'maj7',  fingers: [4,4,5,6,6,3], baseFret: 3 },
  'G#m7':   { name: 'G#m7',   root: 'G#', quality: 'm7',    fingers: [4,4,4,4,6,4], baseFret: 4, barres: [4] },
  'G#sus4': { name: 'G#sus4', root: 'G#', quality: 'sus4',  fingers: [4,4,6,6,6,4], baseFret: 4, barres: [4] },
  'G#dim':  { name: 'G#dim',  root: 'G#', quality: 'dim',   fingers: [4,5,4,5,-1,-1], baseFret: 1 },
  'G#aug':  { name: 'G#aug',  root: 'G#', quality: 'aug',   fingers: [0,0,1,2,3,-1], baseFret: 1 },
  'G#5':    { name: 'G#5',    root: 'G#', quality: '5',     fingers: [-1,-1,-1,6,6,4], baseFret: 1 },
  Ab7:      { name: 'Ab7',    root: 'Ab', quality: '7',     fingers: [4,4,5,4,6,4], baseFret: 4, barres: [4] },
  Abmaj7:   { name: 'Abmaj7', root: 'Ab', quality: 'maj7',  fingers: [4,4,5,6,6,3], baseFret: 3 },

  // ─── A root ────────────────────────────────────────────────────────
  A:      { name: 'A',      root: 'A', quality: 'major', fingers: [0,2,2,2,0,-1], baseFret: 1 },
  Am:     { name: 'Am',     root: 'A', quality: 'm',     fingers: [0,1,2,2,0,-1], baseFret: 1 },
  A7:     { name: 'A7',     root: 'A', quality: '7',     fingers: [0,2,0,2,0,-1], baseFret: 1 },
  Amaj7:  { name: 'Amaj7',  root: 'A', quality: 'maj7',  fingers: [0,2,1,2,0,-1], baseFret: 1 },
  Am7:    { name: 'Am7',    root: 'A', quality: 'm7',    fingers: [0,1,0,2,0,-1], baseFret: 1 },
  Asus2:  { name: 'Asus2',  root: 'A', quality: 'sus2',  fingers: [0,0,2,2,0,-1], baseFret: 1 },
  Asus4:  { name: 'Asus4',  root: 'A', quality: 'sus4',  fingers: [0,3,2,2,0,-1], baseFret: 1 },
  Aadd9:  { name: 'Aadd9',  root: 'A', quality: 'add9',  fingers: [0,0,2,4,0,-1], baseFret: 1 },
  Adim:   { name: 'Adim',   root: 'A', quality: 'dim',   fingers: [1,0,1,0,-1,-1], baseFret: 1 },
  Aaug:   { name: 'Aaug',   root: 'A', quality: 'aug',   fingers: [1,2,2,2,0,-1], baseFret: 1 },
  A6:     { name: 'A6',     root: 'A', quality: '6',     fingers: [2,2,2,2,0,-1], baseFret: 1 },
  Am6:    { name: 'Am6',    root: 'A', quality: 'm6',    fingers: [2,1,2,2,0,-1], baseFret: 1 },
  A9:     { name: 'A9',     root: 'A', quality: '9',     fingers: [0,2,0,2,0,0], baseFret: 1 },
  Am9:    { name: 'Am9',    root: 'A', quality: 'm9',    fingers: [0,1,0,0,0,-1], baseFret: 1 },
  A11:    { name: 'A11',    root: 'A', quality: '11',    fingers: [0,3,0,2,0,-1], baseFret: 1 },
  A13:    { name: 'A13',    root: 'A', quality: '13',    fingers: [2,2,2,2,0,0], baseFret: 1 },
  A5:     { name: 'A5',     root: 'A', quality: '5',     fingers: [-1,-1,-1,2,2,0], baseFret: 1 },
  'Am/E': { name: 'Am/E',  root: 'A', quality: 'm',     fingers: [0,1,2,2,0,0], baseFret: 1 },
  'A/C#': { name: 'A/C#',  root: 'A', quality: 'major', fingers: [0,2,2,2,0,4], baseFret: 1 },
  'A/E':  { name: 'A/E',   root: 'A', quality: 'major', fingers: [0,2,2,2,0,0], baseFret: 1 },

  // ─── A# / Bb root ───────────────────────────────────────────────────
  'A#':     { name: 'A#',     root: 'A#', quality: 'major', fingers: [1,1,2,3,3,1], baseFret: 1, barres: [1] },
  Bb:       { name: 'Bb',     root: 'Bb', quality: 'major', fingers: [1,1,2,3,3,1], baseFret: 1, barres: [1] },
  'A#m':    { name: 'A#m',    root: 'A#', quality: 'm',     fingers: [1,2,3,3,1,1], baseFret: 1, barres: [1] },
  Bbm:      { name: 'Bbm',    root: 'Bb', quality: 'm',     fingers: [1,2,3,3,1,1], baseFret: 1, barres: [1] },
  'A#7':    { name: 'A#7',    root: 'A#', quality: '7',     fingers: [1,1,2,1,3,1], baseFret: 1, barres: [1] },
  Bb7:      { name: 'Bb7',    root: 'Bb', quality: '7',     fingers: [1,1,2,1,3,1], baseFret: 1, barres: [1] },
  Bbmaj7:   { name: 'Bbmaj7', root: 'Bb', quality: 'maj7',  fingers: [1,1,2,3,3,0], baseFret: 1 },
  'A#maj7': { name: 'A#maj7', root: 'A#', quality: 'maj7',  fingers: [1,1,2,3,3,0], baseFret: 1 },
  'A#m7':   { name: 'A#m7',   root: 'A#', quality: 'm7',    fingers: [1,1,1,3,1,1], baseFret: 1, barres: [1] },
  Bbm7:     { name: 'Bbm7',   root: 'Bb', quality: 'm7',    fingers: [1,1,1,3,1,1], baseFret: 1, barres: [1] },
  'A#sus2': { name: 'A#sus2', root: 'A#', quality: 'sus2',  fingers: [1,1,3,3,1,1], baseFret: 1, barres: [1] },
  'A#dim':  { name: 'A#dim',  root: 'A#', quality: 'dim',   fingers: [2,1,2,1,-1,-1], baseFret: 1 },
  'A#aug':  { name: 'A#aug',  root: 'A#', quality: 'aug',   fingers: [2,2,2,0,3,-1], baseFret: 1 },
  'A#5':    { name: 'A#5',    root: 'A#', quality: '5',     fingers: [-1,-1,-1,3,3,1], baseFret: 1 },
  Bb5:      { name: 'Bb5',    root: 'Bb', quality: '5',     fingers: [-1,-1,-1,3,3,1], baseFret: 1 },
  Bbadd9:   { name: 'Bbadd9', root: 'Bb', quality: 'add9',  fingers: [1,1,0,3,3,1], baseFret: 1, barres: [1] },
  Bbsus4:   { name: 'Bbsus4', root: 'Bb', quality: 'sus4',  fingers: [1,1,3,3,3,1], baseFret: 1, barres: [1] },

  // ─── B root ────────────────────────────────────────────────────────
  B:      { name: 'B',      root: 'B', quality: 'major', fingers: [2,2,4,4,4,2], baseFret: 2, barres: [2] },
  Bm:     { name: 'Bm',     root: 'B', quality: 'm',     fingers: [2,3,4,4,2,2], baseFret: 2, barres: [2] },
  B7:     { name: 'B7',     root: 'B', quality: '7',     fingers: [0,2,1,2,2,-1], baseFret: 1 },
  Bmaj7:  { name: 'Bmaj7',  root: 'B', quality: 'maj7',  fingers: [2,2,4,4,4,1], baseFret: 1 },
  Bm7:    { name: 'Bm7',    root: 'B', quality: 'm7',    fingers: [2,2,2,4,2,2], baseFret: 2, barres: [2] },
  Bsus2:  { name: 'Bsus2',  root: 'B', quality: 'sus2',  fingers: [2,2,4,4,2,2], baseFret: 2, barres: [2] },
  Bsus4:  { name: 'Bsus4',  root: 'B', quality: 'sus4',  fingers: [2,2,5,4,2,2], baseFret: 2, barres: [2] },
  Badd9:  { name: 'Badd9',  root: 'B', quality: 'add9',  fingers: [2,2,2,4,4,2], baseFret: 2, barres: [2] },
  Bdim:   { name: 'Bdim',   root: 'B', quality: 'dim',   fingers: [3,4,3,4,-1,-1], baseFret: 1 },
  Baug:   { name: 'Baug',   root: 'B', quality: 'aug',   fingers: [3,3,3,1,2,-1], baseFret: 1 },
  B6:     { name: 'B6',     root: 'B', quality: '6',     fingers: [2,4,4,4,2,2], baseFret: 2, barres: [2] },
  Bm6:    { name: 'Bm6',    root: 'B', quality: 'm6',    fingers: [2,4,3,4,2,2], baseFret: 2, barres: [2] },
  B9:     { name: 'B9',     root: 'B', quality: '9',     fingers: [2,2,4,2,4,2], baseFret: 2, barres: [2] },
  Bm9:    { name: 'Bm9',    root: 'B', quality: 'm9',    fingers: [2,2,2,2,2,2], baseFret: 2, barres: [2] },
  B11:    { name: 'B11',    root: 'B', quality: '11',    fingers: [2,2,2,4,2,2], baseFret: 2, barres: [2] },
  B13:    { name: 'B13',    root: 'B', quality: '13',    fingers: [2,4,4,4,2,2], baseFret: 2, barres: [2] },
  B5:     { name: 'B5',     root: 'B', quality: '5',     fingers: [-1,-1,-1,4,4,2], baseFret: 1 },
  'Bm/F#': { name: 'Bm/F#', root: 'B', quality: 'm',    fingers: [2,3,4,4,2,2], baseFret: 2, barres: [2] },
  'B/D#':  { name: 'B/D#',  root: 'B', quality: 'major', fingers: [2,2,4,4,4,6], baseFret: 2, barres: [2] },
  'B/F#':  { name: 'B/F#',  root: 'B', quality: 'major', fingers: [2,2,4,4,4,2], baseFret: 2, barres: [2] },
};

export const ALL_CHORDS: string[] = Object.keys(CHORD_LIBRARY);

export const ROOTS = ['C', 'C#', 'Db', 'D', 'D#', 'Eb', 'E', 'F', 'F#', 'Gb', 'G', 'G#', 'Ab', 'A', 'A#', 'Bb', 'B'];

export const QUALITIES = ['major', 'm', '7', 'maj7', 'm7', 'sus2', 'sus4', 'add9', 'dim', 'aug', '6', 'm6', '9', 'm9', '11', '13', '5'];

export const COMMON_ROOTS = ['C', 'D', 'E', 'F', 'G', 'A', 'B', 'Am', 'Em', 'Dm'];

export const RECENTLY_USED_KEY = 'songwriter_recently_used_chords';
export const FAVORITES_KEY = 'songwriter_favorite_chords';

export function getChord(name: string): ChordDefinition | undefined {
  return CHORD_LIBRARY[name];
}

export function searchChords(query: string): string[] {
  const q = query.toLowerCase();
  return ALL_CHORDS.filter(name => name.toLowerCase().includes(q));
}

export function getChordsByRoot(root: string): string[] {
  return ALL_CHORDS.filter(name => {
    const def = CHORD_LIBRARY[name];
    return def && def.root === root;
  });
}

export function getChordsByQuality(quality: string): string[] {
  return ALL_CHORDS.filter(name => {
    const def = CHORD_LIBRARY[name];
    return def && def.quality === quality;
  });
}
