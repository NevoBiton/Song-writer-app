import React, { useState } from 'react';
import { Plus, Music, Search, Share2, Check } from 'lucide-react';
import { toast } from 'sonner';
import { Song } from '../../types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';

interface Props {
  songs: Song[];
  loading?: boolean;
  onSelectSong: (song: Song) => void;
  onCreateSong: (title: string, language: Song['language']) => Promise<Song>;
  onDeleteSong: (id: string) => Promise<void>;
  onDuplicateSong: (id: string) => Promise<Song | undefined>;
  isMobile?: boolean;
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
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function formatSongForShare(song: Song): string {
  const lines: string[] = [];
  if (song.title) lines.push(song.title);
  if (song.artist) lines.push(`by ${song.artist}`);
  if (song.key) lines.push(`Key: ${song.key}`);
  lines.push('');
  for (const section of song.sections) {
    if (section.label) lines.push(`[${section.label}]`);
    for (const line of section.lines) {
      const chordLine = line.tokens.map(t => t.chord ? t.chord.padEnd(Math.max(t.chord.length, t.text.length + 1)) : ' '.repeat(t.text.length + 1)).join('').trimEnd();
      const wordLine = line.tokens.map(t => t.text).join('');
      if (chordLine.trim()) lines.push(chordLine);
      if (wordLine.trim()) lines.push(wordLine);
    }
    lines.push('');
  }
  return lines.join('\n');
}

const LANG_LABELS: Record<string, string> = {
  en: 'EN', he: 'עב', mixed: 'EN/עב',
};

const SECTION_TYPE_COLORS: Record<string, string> = {
  verse: 'bg-blue-100 text-blue-700',
  chorus: 'bg-amber-100 text-amber-700',
  bridge: 'bg-purple-100 text-purple-700',
  intro: 'bg-green-100 text-green-700',
  outro: 'bg-red-100 text-red-700',
  custom: 'bg-gray-100 text-gray-700',
};

export default function SongList({
  songs,
  loading,
  onSelectSong,
  onCreateSong,
  onDeleteSong,
  onDuplicateSong,
}: Props) {
  const [query, setQuery] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newLang, setNewLang] = useState<Song['language']>('en');
  const [contextMenu, setContextMenu] = useState<{ songId: string; x: number; y: number } | null>(null);
  const [creating, setCreating] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const filtered = query
    ? songs.filter(s =>
        s.title.toLowerCase().includes(query.toLowerCase()) ||
        (s.artist && s.artist.toLowerCase().includes(query.toLowerCase()))
      )
    : songs;

  async function handleCreate() {
    if (!newTitle.trim()) return;
    setCreating(true);
    try {
      const song = await onCreateSong(newTitle.trim(), newLang);
      setShowCreate(false);
      setNewTitle('');
      onSelectSong(song);
    } finally {
      setCreating(false);
    }
  }

  async function handleShare(songId: string) {
    const song = songs.find(s => s.id === songId);
    if (!song) return;
    const text = formatSongForShare(song);
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(songId);
      toast.success(`"${song.title}" copied to clipboard`);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      toast.error('Failed to copy to clipboard');
    }
    setContextMenu(null);
  }

  function handleContextMenu(e: React.MouseEvent, songId: string) {
    e.preventDefault();
    setContextMenu({ songId, x: e.clientX, y: e.clientY });
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-amber-400 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-muted-foreground text-sm">Loading your songs...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6" onClick={() => setContextMenu(null)}>
      {/* Page header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">My Song Library</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            {songs.length} {songs.length === 1 ? 'song' : 'songs'} in your collection
          </p>
        </div>
        <Button
          size="sm"
          onClick={() => setShowCreate(true)}
          className="gap-1.5 bg-amber-400 hover:bg-amber-500 text-gray-900 font-bold border-0"
        >
          <Plus className="w-4 h-4" />
          New Song
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <Input
          type="search"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search songs by title or artist..."
          className="pl-9 focus-visible:ring-amber-400"
        />
      </div>

      {/* Song grid */}
      {filtered.length === 0 && !query ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <div className="w-20 h-20 rounded-full bg-amber-50 flex items-center justify-center">
            <Music className="w-10 h-10 text-amber-400" />
          </div>
          <div className="text-center">
            <h2 className="text-xl font-bold text-foreground mb-1">No songs yet</h2>
            <p className="text-muted-foreground text-sm mb-6">Create your first song to get started</p>
            <Button
              onClick={() => setShowCreate(true)}
              className="bg-amber-400 hover:bg-amber-500 text-gray-900 font-bold border-0"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create your first song
            </Button>
          </div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          No songs match &ldquo;{query}&rdquo;
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(song => (
            <Card
              key={song.id}
              className="cursor-pointer border-border hover:border-amber-300 hover:shadow-md transition-all group"
              onClick={() => onSelectSong(song)}
              onContextMenu={e => handleContextMenu(e, song.id)}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-foreground truncate group-hover:text-amber-600 transition-colors">
                      {song.title}
                    </h3>
                    {song.artist && (
                      <p className="text-muted-foreground text-sm truncate mt-0.5">{song.artist}</p>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                    {song.key && (
                      <span className="text-amber-600 text-xs font-mono font-bold bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                        {song.key}
                      </span>
                    )}
                    <Badge variant="secondary" className="text-xs px-1.5">
                      {LANG_LABELS[song.language] || 'EN'}
                    </Badge>
                  </div>
                </div>

                {/* Section type pills */}
                {song.sections.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-3">
                    {song.sections.slice(0, 4).map(section => (
                      <span
                        key={section.id}
                        className={`text-xs px-1.5 py-0.5 rounded font-medium ${SECTION_TYPE_COLORS[section.type] || SECTION_TYPE_COLORS.custom}`}
                      >
                        {section.label || section.type}
                      </span>
                    ))}
                    {song.sections.length > 4 && (
                      <span className="text-xs text-gray-400">+{song.sections.length - 4}</span>
                    )}
                  </div>
                )}

                <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
                  <span className="text-muted-foreground text-xs">{timeAgo(song.updatedAt)}</span>
                  <span className="text-muted-foreground text-xs">
                    {song.sections.length} section{song.sections.length !== 1 ? 's' : ''}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Context menu */}
      {contextMenu && (
        <div
          className="fixed z-50 bg-card rounded-xl shadow-xl border border-border py-1 min-w-[160px]"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={e => e.stopPropagation()}
        >
          <button
            onClick={() => {
              const s = songs.find(s => s.id === contextMenu.songId);
              if (s) onSelectSong(s);
              setContextMenu(null);
            }}
            className="w-full text-left px-4 py-2 text-sm text-foreground hover:bg-accent"
          >
            ✎ Edit
          </button>
          <button
            onClick={async () => {
              await onDuplicateSong(contextMenu.songId);
              setContextMenu(null);
            }}
            className="w-full text-left px-4 py-2 text-sm text-foreground hover:bg-accent"
          >
            ⎘ Duplicate
          </button>
          <button
            onClick={() => handleShare(contextMenu.songId)}
            className="w-full text-left px-4 py-2 text-sm text-foreground hover:bg-accent flex items-center gap-2"
          >
            {copiedId === contextMenu.songId
              ? <Check className="w-3.5 h-3.5 text-green-500" />
              : <Share2 className="w-3.5 h-3.5" />}
            Share
          </button>
          <hr className="border-border my-1" />
          <button
            onClick={async () => {
              await onDeleteSong(contextMenu.songId);
              setContextMenu(null);
            }}
            className="w-full text-left px-4 py-2 text-sm text-destructive hover:bg-destructive/10"
          >
            🗑 Delete
          </button>
        </div>
      )}

      {/* Create dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>New Song</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="song-title">Song title</Label>
              <Input
                id="song-title"
                autoFocus
                value={newTitle}
                onChange={e => setNewTitle(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleCreate()}
                placeholder="e.g. Hey Jude / שיר לשבת"
                className="focus-visible:ring-amber-400"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Song language</Label>
              <div className="flex gap-2">
                {(['en', 'he', 'mixed'] as Song['language'][]).map(lang => (
                  <button
                    key={lang}
                    onClick={() => setNewLang(lang)}
                    className={`flex-1 py-2 text-sm rounded-lg border transition-colors ${
                      newLang === lang
                        ? 'bg-amber-400 text-gray-900 border-amber-400 font-bold'
                        : 'bg-background text-muted-foreground border-border hover:border-muted-foreground'
                    }`}
                  >
                    {LANG_LABELS[lang]}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              disabled={!newTitle.trim() || creating}
              className="bg-amber-400 hover:bg-amber-500 text-gray-900 font-bold border-0"
            >
              {creating ? 'Creating...' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
