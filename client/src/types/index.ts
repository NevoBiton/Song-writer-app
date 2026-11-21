export interface Song {
  id: string;
  userId: string;
  title: string;
  artist?: string;
  key?: string;
  capo?: number;
  language: 'he' | 'en' | 'mixed';
  sections: Section[];
  recentChords?: string[];
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
  chords?: string[];   // up to 5 chords per token
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

// ─── Social / Collaboration types ─────────────────────────────────────────────

export interface Friend {
  id: string;           // friendship ID
  friendId: string;     // user ID of the friend
  username: string;
  avatar?: string;
  online: boolean;
}

export interface FriendRequest {
  id: string;           // friendship ID
  requesterId: string;
  requesterUsername: string;
  requesterAvatar?: string;
  createdAt: string;
}

export interface Collaborator {
  id: string;
  userId: string;
  role: 'owner' | 'editor';
  status?: 'pending' | 'accepted';
  joinedAt: string;
  username: string;
  avatar?: string;
}

export interface SongDraft {
  id: string;
  songId: string;
  userId: string;
  sections: Section[];
  status: 'draft' | 'proposed' | 'accepted' | 'rejected';
  note?: string;
  username?: string;
  avatar?: string;
  updatedAt: string;
}

export interface SongVersion {
  id: string;
  songId: string;
  sections: Section[];
  proposedBy: string;
  username: string;
  createdAt: string;
}
