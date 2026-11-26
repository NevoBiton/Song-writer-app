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

export interface ToolResult {
  text: string;
  data?: StructuredData;
}
