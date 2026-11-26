export interface SongItem {
  id: string;
  title: string;
  artist?: string | null;
  key?: string | null;
  capo?: number | null;
}

export interface SongListData {
  type: 'song_list';
  songs: SongItem[];
  total: number;
}

// Union type — extend here when new structured responses are added
export type StructuredData = SongListData;

// Side-channel context passed to every tool via config.configurable
export interface RunContext {
  structuredData?: StructuredData;
}
