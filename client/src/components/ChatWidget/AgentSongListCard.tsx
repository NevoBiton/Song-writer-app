import { Music } from 'lucide-react';

export interface SongItem {
  id: string;
  title: string;
  artist?: string | null;
  key?: string | null;
  capo?: number | null;
}

interface Props {
  songs: SongItem[];
  total: number;
}

export function AgentSongListCard({ songs, total }: Props) {
  return (
    <div className="rounded-xl border border-border bg-background overflow-hidden text-xs w-full">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 bg-muted border-b border-border">
        <Music className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
        <span className="font-semibold text-foreground">
          {total} {total === 1 ? 'song' : 'songs'}
        </span>
      </div>

      {/* Song rows */}
      <ul className="divide-y divide-border">
        {songs.map(song => (
          <li key={song.id} className="flex items-center justify-between gap-2 px-3 py-2 hover:bg-muted/50 transition-colors">
            <span className="font-medium text-foreground truncate">{song.title}</span>
            <div className="flex items-center gap-1.5 flex-shrink-0 text-muted-foreground">
              {song.artist && (
                <span className="truncate max-w-[80px]">{song.artist}</span>
              )}
              {song.key && (
                <span className="bg-amber-400/20 text-amber-700 dark:text-amber-400 px-1.5 py-0.5 rounded font-mono">
                  {song.key}
                </span>
              )}
              {song.capo ? (
                <span className="text-muted-foreground">capo {song.capo}</span>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
