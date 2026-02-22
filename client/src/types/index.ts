export interface Song {
  id: string;
  title: string;
  artist?: string;
  key?: string;
  capo?: number;
  language: 'he' | 'en' | 'mixed';
  sections: Section[];
  createdAt: string;
  updatedAt: string;
}

export interface Section {
  id: string;
  type: 'verse' | 'chorus' | 'bridge' | 'intro' | 'outro' | 'custom';
  label?: string;
  lines: Line[];
}

export interface Line {
  id: string;
  tokens: Token[];
}

export interface Token {
  id: string;
  text: string;
  chord?: string;
  isSpace?: boolean;
}

export interface ChordDefinition {
  name: string;
  root: string;
  quality: string;
  fingers: number[];
  baseFret: number;
  barres?: number[];
}

export type SectionType = Section['type'];
export type Language = Song['language'];

export interface SongSummary {
  id: string;
  title: string;
  artist?: string;
  key?: string;
  language: Language;
  updatedAt: string;
}
