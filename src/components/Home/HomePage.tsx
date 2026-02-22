import { useNavigate } from 'react-router-dom';
import { Music, Plus, BookOpen, Clock } from 'lucide-react';
import { Song } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useAuth } from '@/context/AuthContext';

interface Props {
  songs: Song[];
  onSelectSong: (song: Song) => void;
  onCreateSong: (title: string, lang: Song['language']) => Promise<Song>;
}

function timeAgo(iso: string | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  const diff = Date.now() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function HomePage({ songs, onSelectSong, onCreateSong }: Props) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const recent = songs.slice(0, 4);

  async function handleNewSong() {
    const song = await onCreateSong('Untitled Song', 'en');
    onSelectSong(song);
    navigate('/library');
  }

  return (
    <div className="space-y-8 max-w-4xl">
      {/* Hero greeting */}
      <div className="relative overflow-hidden rounded-2xl bg-amber-400 p-8">
        <div className="relative z-10">
          <p className="text-amber-900 text-sm font-semibold uppercase tracking-wider mb-1">Welcome back</p>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {user?.username} 👋
          </h1>
          <p className="text-amber-800 mb-6 max-w-sm">
            You have {songs.length} {songs.length === 1 ? 'song' : 'songs'} in your collection. Keep writing!
          </p>
          <div className="flex gap-3 flex-wrap">
            <Button
              onClick={handleNewSong}
              className="bg-gray-900 hover:bg-gray-800 text-white font-bold border-0 gap-2"
            >
              <Plus className="w-4 h-4" />
              New Song
            </Button>
            <Button
              onClick={() => navigate('/library')}
              variant="outline"
              className="border-amber-600 text-amber-900 hover:bg-amber-500 gap-2"
            >
              <BookOpen className="w-4 h-4" />
              My Library
            </Button>
          </div>
        </div>
        {/* Decorative blobs */}
        <div className="absolute top-0 right-0 w-48 h-48 bg-amber-300/40 rounded-full translate-x-16 -translate-y-8 pointer-events-none" />
        <div className="absolute bottom-0 right-24 w-32 h-32 bg-amber-500/30 rounded-full translate-y-8 pointer-events-none" />
        <div className="absolute top-1/2 right-8 text-5xl select-none opacity-20 pointer-events-none">🎸</div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {[
          { icon: Music, label: 'Total Songs', value: songs.length },
          { icon: BookOpen, label: 'With Chords', value: songs.filter(s => s.sections.some(sec => sec.lines.some(l => l.tokens.some(t => t.chord)))).length },
          { icon: Clock, label: 'This Week', value: songs.filter(s => { const d = new Date(s.updatedAt); return !isNaN(d.getTime()) && Date.now() - d.getTime() < 7 * 86400000; }).length },
        ].map(({ icon: Icon, label, value }) => (
          <Card key={label} className="border-border">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center flex-shrink-0">
                <Icon className="w-4 h-4 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{value}</p>
                <p className="text-xs text-muted-foreground">{label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent songs */}
      {recent.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-semibold text-foreground">Recently Edited</h2>
            <button
              onClick={() => navigate('/library')}
              className="text-xs text-amber-600 hover:text-amber-700 font-medium"
            >
              View all →
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {recent.map(song => (
              <button
                key={song.id}
                onClick={() => { onSelectSong(song); navigate('/library'); }}
                className="text-left p-4 rounded-xl border border-border bg-card hover:border-amber-400 hover:shadow-sm transition-all group"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold text-foreground truncate group-hover:text-amber-600 transition-colors">
                      {song.title}
                    </p>
                    {song.artist && (
                      <p className="text-xs text-muted-foreground truncate mt-0.5">{song.artist}</p>
                    )}
                  </div>
                  {song.key && (
                    <span className="text-amber-600 text-xs font-mono font-bold bg-amber-50 dark:bg-amber-900/20 px-2 py-0.5 rounded-full border border-amber-200 dark:border-amber-800 flex-shrink-0">
                      {song.key}
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-2">{timeAgo(song.updatedAt)}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {songs.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
          <div className="w-20 h-20 rounded-full bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center">
            <Music className="w-10 h-10 text-amber-400" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground text-lg mb-1">No songs yet</h3>
            <p className="text-muted-foreground text-sm mb-4">Start your chord notebook by creating your first song</p>
            <Button onClick={handleNewSong} className="bg-amber-400 hover:bg-amber-500 text-gray-900 font-bold border-0">
              <Plus className="w-4 h-4 mr-2" /> Create first song
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
