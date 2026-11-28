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

export interface AwaitingApprovalData {
  type: 'awaiting_approval';
  /** Thread ID the client must send back to resume the graph. */
  threadId: string;
  /** The destructive tool that was about to run. */
  tool: string;
  /** The arguments that will be passed to the tool on confirmation. */
  args: Record<string, unknown>;
}

// Union type — extend here when new structured responses are added
export type StructuredData = SongListData | AwaitingApprovalData;

// Side-channel context passed to every tool via config.configurable
export interface RunContext {
  structuredData?: StructuredData;
}
