import React, { useState, useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { ALL_CHORDS, searchChords, getChordsByQuality, RECENTLY_USED_KEY, FAVORITES_KEY } from '../../data/chords';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (chord: string) => void;
  onRemove?: () => void;
  currentChord?: string;
  isMobile: boolean;
}

function loadList(key: string): string[] {
  try { return JSON.parse(localStorage.getItem(key) || '[]'); } catch { return []; }
}
function saveList(key: string, list: string[]): void {
  localStorage.setItem(key, JSON.stringify(list));
}

export default function ChordPicker({ isOpen, onClose, onSelect, onRemove, currentChord, isMobile }: Props) {
  const [query, setQuery] = useState('');
  const [rootFilter, setRootFilter] = useState('');
  const [qualityFilter, setQualityFilter] = useState('');
  const [recentlyUsed, setRecentlyUsed] = useState<string[]>(() => loadList(RECENTLY_USED_KEY));
  const [favorites, setFavorites] = useState<string[]>(() => loadList(FAVORITES_KEY));
  const searchRef = useRef<HTMLInputElement>(null);

  // Reset everything when picker opens
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setRootFilter('');
      setQualityFilter('');
      setTimeout(() => searchRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const isSlashChord = /^[A-G][#b]?[a-zA-Z0-9]*\/[A-G][#b]?$/.test(query.trim());

  const filteredChords: string[] = (() => {
    if (query) return searchChords(query);
    let chords = ALL_CHORDS;
    if (rootFilter) chords = chords.filter(c =>
      c.startsWith(rootFilter) && (c[rootFilter.length] === undefined || !/[A-G]/.test(c[rootFilter.length]))
    );
    if (qualityFilter) {
      chords = getChordsByQuality(qualityFilter);
      if (rootFilter) chords = chords.filter(c => c.startsWith(rootFilter));
    }
    return chords;
  })();

  function handleSelect(chord: string) {
    const updated = [chord, ...recentlyUsed.filter(c => c !== chord)].slice(0, 4);
    setRecentlyUsed(updated);
    saveList(RECENTLY_USED_KEY, updated);
    onSelect(chord);
    onClose();
  }

  function toggleFavorite(chord: string, e: React.MouseEvent) {
    e.stopPropagation();
    setFavorites(prev => {
      const next = prev.includes(chord)
        ? prev.filter(c => c !== chord)
        : [chord, ...prev].slice(0, 20);
      saveList(FAVORITES_KEY, next);
      return next;
    });
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    if (isOpen) document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  const content = (
    <div className="flex flex-col h-full max-h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-border flex-shrink-0">
        {isMobile && (
          <div className="w-10 h-1 bg-border rounded-full mx-auto absolute left-1/2 -translate-x-1/2 top-2" />
        )}
        <h2 className="text-foreground font-bold text-base">Pick a Chord</h2>
        <div className="flex gap-2">
          {onRemove && currentChord && (
            <Button
              variant="destructive"
              size="sm"
              onClick={() => { onRemove(); onClose(); }}
            >
              Remove
            </Button>
          )}
          <Button variant="ghost" size="icon" onClick={onClose} className="text-muted-foreground h-8 w-8">
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Search */}
        <div className="p-2 flex-shrink-0">
          <Input
            ref={searchRef}
            type="text"
            value={query}
            onChange={e => { setQuery(e.target.value); setRootFilter(''); setQualityFilter(''); }}
            placeholder="Search or type slash chord (C/E)..."
            className="focus-visible:ring-amber-400 h-11 text-base"
          />
        </div>

        {/* Root selected: back button + quality filters */}
        {(rootFilter || query) && (
          <>
            {rootFilter && (
              <div className="px-2 pb-1 flex items-center gap-2 flex-shrink-0">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => { setRootFilter(''); setQualityFilter(''); }}
                  className="text-xs h-7 px-2 text-muted-foreground"
                >
                  ← Back
                </Button>
                <span className="text-base font-bold font-mono text-amber-600">{rootFilter}</span>
              </div>
            )}
            <div className="px-2 pb-2 flex flex-wrap gap-1 flex-shrink-0">
              {['m','7','maj7','m7','sus2','sus4','dim','aug','add9'].map(q => (
                <Button
                  key={q}
                  size="sm"
                  variant={qualityFilter === q ? 'default' : 'outline'}
                  onClick={() => { setQualityFilter(qualityFilter === q ? '' : q); setQuery(''); }}
                  className={`px-2 h-7 text-sm ${qualityFilter === q ? 'bg-blue-500 hover:bg-blue-600 border-blue-500 text-white' : ''}`}
                >
                  {q}
                </Button>
              ))}
            </div>
          </>
        )}

        {/* Home screen: recent + favorites + root selector */}
        {!query && !rootFilter && (
          <div className="flex-1 overflow-y-auto px-2 pb-2 flex flex-col gap-3">
            {recentlyUsed.length > 0 && (
              <div>
                <p className="text-muted-foreground text-xs mb-1 uppercase tracking-wide">Recent</p>
                <div className="flex flex-wrap gap-1">
                  {recentlyUsed.map(chord => (
                    <Button
                      key={chord}
                      size="sm"
                      variant="outline"
                      onClick={() => handleSelect(chord)}
                      className="px-3 h-auto py-1.5 text-base font-mono text-amber-600 hover:border-amber-400"
                    >
                      {chord}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {favorites.length > 0 && (
              <div>
                <p className="text-muted-foreground text-xs mb-1 uppercase tracking-wide">Favorites ★</p>
                <div className="flex flex-wrap gap-1">
                  {favorites.map(chord => (
                    <Button
                      key={chord}
                      size="sm"
                      variant="outline"
                      onClick={() => handleSelect(chord)}
                      className="px-3 h-auto py-1.5 text-base font-mono text-yellow-600 hover:border-yellow-400"
                    >
                      {chord}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            <div>
              <p className="text-muted-foreground text-xs mb-2 uppercase tracking-wide">Pick a root note</p>
              <div className="grid grid-cols-4 gap-2">
                {['C','D','E','F','G','A','B','C#','D#','F#','G#','A#'].map(root => (
                  <button
                    key={root}
                    onClick={() => setRootFilter(root)}
                    className="flex items-center justify-center py-4 text-xl font-mono font-bold rounded-xl border border-border bg-card hover:border-amber-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors"
                  >
                    {root}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Chord grid (root selected or searching) */}
        {(query || rootFilter) && (
          <div className="flex-1 overflow-y-auto px-2 pb-2">
            {isSlashChord && (
              <button
                onClick={() => handleSelect(query.trim())}
                className="w-full mb-2 flex items-center justify-center py-3 text-base font-mono font-bold rounded-lg border-2 border-amber-400 bg-amber-50 dark:bg-amber-900/20 text-amber-700 hover:bg-amber-100 transition-colors"
              >
                Use "{query.trim()}"
              </button>
            )}
            <div className="grid grid-cols-3 gap-1">
              {filteredChords.map(chord => (
                <button
                  key={chord}
                  onClick={() => handleSelect(chord)}
                  className="relative flex items-center justify-center px-1 py-3 text-base font-mono rounded-lg border border-border bg-card hover:border-amber-400 hover:text-amber-600 transition-colors"
                >
                  <span>{chord}</span>
                  <button
                    onClick={e => toggleFavorite(chord, e)}
                    className="absolute top-0.5 right-0.5 text-xs opacity-40 hover:opacity-100 transition-opacity"
                    aria-label={favorites.includes(chord) ? 'Unfavorite' : 'Favorite'}
                  >
                    {favorites.includes(chord) ? '★' : '☆'}
                  </button>
                </button>
              ))}
            </div>
            {filteredChords.length === 0 && (
              <p className="text-muted-foreground text-sm text-center py-4">No chords found</p>
            )}
          </div>
        )}
      </div>
    </div>
  );

  if (isMobile) {
    return (
      <>
        {isOpen && (
          <div className="fixed inset-0 bg-black/40 z-40" onClick={onClose} />
        )}
        <div
          className={`bottom-sheet ${isOpen ? 'bottom-sheet-open' : 'bottom-sheet-closed'}`}
          style={{ height: '75vh', maxHeight: '75vh' }}
        >
          <div className="absolute top-2 left-1/2 -translate-x-1/2 w-10 h-1 bg-border rounded-full" />
          <div className="pt-4 h-full flex flex-col">
            {content}
          </div>
        </div>
      </>
    );
  }

  if (!isOpen) return null;
  return (
    <>
      <div className="fixed inset-0 bg-black/20 z-40" onClick={onClose} />
      <div className="fixed right-4 top-20 bottom-4 w-96 z-50 bg-card rounded-2xl shadow-2xl border border-border flex flex-col overflow-hidden">
        {content}
      </div>
    </>
  );
}
