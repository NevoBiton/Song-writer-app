import React, { useState } from 'react';
import { Song } from '../../types';

interface Props {
  songs: Song[];
  onSelectSong: (song: Song) => void;
  onCreateSong: (title: string, language: Song['language']) => Song;
  onDeleteSong: (id: string) => void;
  onDuplicateSong: (id: string) => Song | undefined;
  onImportChordPro: (text: string) => Song;
  isMobile?: boolean;
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

const LANG_LABELS: Record<string, string> = {
  en: 'EN', he: 'עב', mixed: 'EN/עב',
};

export default function SongList({ songs, onSelectSong, onCreateSong, onDeleteSong, onDuplicateSong, onImportChordPro }: Props) {
  const [query, setQuery] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newLang, setNewLang] = useState<Song['language']>('en');
  const [showImport, setShowImport] = useState(false);
  const [importText, setImportText] = useState('');
  const [contextMenu, setContextMenu] = useState<{ songId: string; x: number; y: number } | null>(null);

  const filtered = query
    ? songs.filter(s =>
        s.title.toLowerCase().includes(query.toLowerCase()) ||
        (s.artist && s.artist.toLowerCase().includes(query.toLowerCase()))
      )
    : songs;

  function handleCreate() {
    if (!newTitle.trim()) return;
    const song = onCreateSong(newTitle.trim(), newLang);
    setShowCreate(false);
    setNewTitle('');
    onSelectSong(song);
  }

  function handleImport() {
    if (!importText.trim()) return;
    const song = onImportChordPro(importText);
    setShowImport(false);
    setImportText('');
    onSelectSong(song);
  }

  function handleContextMenu(e: React.MouseEvent, songId: string) {
    e.preventDefault();
    setContextMenu({ songId, x: e.clientX, y: e.clientY });
  }

  return (
    <div className="flex flex-col h-screen bg-gray-950" onClick={() => setContextMenu(null)}>
      {/* Header */}
      <div className="px-4 pt-6 pb-3 bg-gray-950 flex-shrink-0">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-white">SongWriter Pro</h1>
            <p className="text-amber-400 text-sm">מחברת שירים</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowImport(true)}
              className="px-3 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl text-sm touch-target"
            >
              Import
            </button>
            <button
              onClick={() => setShowCreate(true)}
              className="px-3 py-2 bg-amber-500 hover:bg-amber-400 text-black font-bold rounded-xl text-sm touch-target"
            >
              + New Song
            </button>
          </div>
        </div>

        {/* Search */}
        <input
          type="search"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search songs..."
          className="w-full bg-gray-800 text-white rounded-xl px-4 py-2.5 text-sm border border-gray-700 focus:border-amber-400 focus:outline-none"
        />
      </div>

      {/* Song list */}
      <div className="flex-1 overflow-y-auto px-4 py-2">
        {filtered.length === 0 && !query ? (
          <div className="flex flex-col items-center justify-center h-full gap-4 pb-16">
            <div className="text-6xl">🎸</div>
            <div className="text-center">
              <h2 className="text-xl font-bold text-white mb-1">No songs yet</h2>
              <p className="text-gray-500 text-sm mb-4">Create your first song to get started</p>
              <button
                onClick={() => setShowCreate(true)}
                className="px-6 py-3 bg-amber-500 hover:bg-amber-400 text-black font-bold rounded-2xl text-base touch-target"
              >
                Create your first song
              </button>
            </div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            No songs match "{query}"
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {filtered.map(song => (
              <div
                key={song.id}
                className="bg-gray-900 hover:bg-gray-800 rounded-2xl p-4 cursor-pointer border border-gray-800 hover:border-gray-700 transition-all"
                onClick={() => onSelectSong(song)}
                onContextMenu={e => handleContextMenu(e, song.id)}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="text-white font-semibold truncate text-base">{song.title}</h3>
                    {song.artist && (
                      <p className="text-gray-400 text-sm truncate">{song.artist}</p>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-1 flex-shrink-0">
                    {song.key && (
                      <span className="text-amber-400 text-xs font-mono font-bold bg-amber-400/10 px-2 py-0.5 rounded-full">
                        {song.key}
                      </span>
                    )}
                    <span className="text-gray-600 text-xs">
                      {LANG_LABELS[song.language] || 'EN'}
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-between mt-3">
                  <span className="text-gray-600 text-xs">{timeAgo(song.updatedAt)}</span>
                  <span className="text-gray-600 text-xs">
                    {song.sections.length} section{song.sections.length !== 1 ? 's' : ''}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Context menu */}
      {contextMenu && (
        <div
          className="fixed z-50 bg-gray-800 rounded-xl shadow-xl border border-gray-700 py-1 min-w-[150px]"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={e => e.stopPropagation()}
        >
          <button
            onClick={() => {
              const s = songs.find(s => s.id === contextMenu.songId);
              if (s) onSelectSong(s);
              setContextMenu(null);
            }}
            className="w-full text-left px-4 py-2 text-sm text-white hover:bg-gray-700"
          >
            ✎ Edit
          </button>
          <button
            onClick={() => { onDuplicateSong(contextMenu.songId); setContextMenu(null); }}
            className="w-full text-left px-4 py-2 text-sm text-white hover:bg-gray-700"
          >
            ⎘ Duplicate
          </button>
          <hr className="border-gray-700 my-1" />
          <button
            onClick={() => { onDeleteSong(contextMenu.songId); setContextMenu(null); }}
            className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-gray-700"
          >
            🗑 Delete
          </button>
        </div>
      )}

      {/* Create dialog */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 rounded-2xl p-6 w-full max-w-sm border border-gray-700 shadow-2xl">
            <h2 className="text-white font-bold text-lg mb-4">New Song</h2>
            <div className="space-y-3">
              <div>
                <label className="text-gray-400 text-xs block mb-1">Song title</label>
                <input
                  autoFocus
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleCreate()}
                  placeholder="e.g. Hey Jude / שיר לשבת"
                  className="w-full bg-gray-800 text-white rounded-lg px-3 py-2 text-sm border border-gray-700 focus:border-amber-400 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-gray-400 text-xs block mb-1">Language</label>
                <div className="flex gap-2">
                  {(['en', 'he', 'mixed'] as Song['language'][]).map(lang => (
                    <button
                      key={lang}
                      onClick={() => setNewLang(lang)}
                      className={`flex-1 py-2 text-sm rounded-lg border transition-colors ${
                        newLang === lang
                          ? 'bg-amber-500 text-black border-amber-400 font-bold'
                          : 'bg-gray-800 text-gray-300 border-gray-700 hover:border-gray-500'
                      }`}
                    >
                      {LANG_LABELS[lang]}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button
                onClick={() => setShowCreate(false)}
                className="flex-1 py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl text-sm touch-target"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={!newTitle.trim()}
                className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-400 text-black font-bold rounded-xl text-sm disabled:opacity-40 touch-target"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Import dialog */}
      {showImport && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 rounded-2xl p-6 w-full max-w-lg border border-gray-700 shadow-2xl">
            <h2 className="text-white font-bold text-lg mb-2">Import ChordPro</h2>
            <p className="text-gray-400 text-xs mb-3">Paste ChordPro format text below</p>
            <textarea
              autoFocus
              value={importText}
              onChange={e => setImportText(e.target.value)}
              rows={10}
              className="w-full bg-gray-800 text-gray-200 rounded-lg px-3 py-2 text-sm font-mono border border-gray-700 focus:border-amber-400 focus:outline-none resize-y"
              placeholder="{title: My Song}&#10;{key: Am}&#10;&#10;[Am]Hello [G]world"
            />
            <div className="flex gap-2 mt-3">
              <button
                onClick={() => setShowImport(false)}
                className="flex-1 py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl text-sm touch-target"
              >
                Cancel
              </button>
              <button
                onClick={handleImport}
                disabled={!importText.trim()}
                className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-400 text-black font-bold rounded-xl text-sm disabled:opacity-40 touch-target"
              >
                Import
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
