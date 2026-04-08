import React, { useState, useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { ALL_CHORDS, searchChords, getChordsByQuality, RECENTLY_USED_KEY, FAVORITES_KEY } from '../../data/chords';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const MAX_CHORDS = 5;

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (chord: string) => void;
  onRemoveChord: (chord: string) => void;
  currentChords: string[];
  isMobile: boolean;
}

function loadList(key: string): string[] {
  try { return JSON.parse(localStorage.getItem(key) || '[]'); } catch { return []; }
}
function saveList(key: string, list: string[]): void {
  localStorage.setItem(key, JSON.stringify(list));
}

export default function ChordPicker({ isOpen, onClose, onSelect, onRemoveChord, currentChords, isMobile }: Props) {
  const [query, setQuery] = useState('');
  const [rootFilter, setRootFilter] = useState('');
  const [qualityFilter, setQualityFilter] = useState('');
  const [recentlyUsed, setRecentlyUsed] = useState<string[]>(() => loadList(RECENTLY_USED_KEY));
  const [favorites, setFavorites] = useState<string[]>(() => loadList(FAVORITES_KEY));
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setRootFilter('');
      setQualityFilter('');
      setTimeout(() => searchRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const isAtMax = currentChords.length >= MAX_CHORDS;
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
    if (isAtMax) return;
    const updated = [chord, ...recentlyUsed.filter(c => c !== chord)].slice(0, 4);
    setRecentlyUsed(updated);
    saveList(RECENTLY_USED_KEY, updated);
    onSelect(chord);
    // Don't close — let user add more chords
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
      <div className="flex items-center justify-between p-3 md:p-4 lg:p-5 border-b border-border flex-shrink-0">
        {isMobile && (
          <div className="w-10 h-1 bg-border rounded-full mx-auto absolute left-1/2 -translate-x-1/2 top-2" />
        )}
        <h2 className="text-foreground font-bold text-base md:text-xl lg:text-3xl">Pick a Chord</h2>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="text-muted-foreground h-8 w-8 md:h-11 md:w-11 lg:h-14 lg:w-14"
        >
          <X className="w-4 h-4 md:w-5 md:h-5 lg:w-7 lg:h-7" />
        </Button>
      </div>

      {/* Current chords row */}
      {currentChords.length > 0 && (
        <div className="px-3 md:px-4 lg:px-5 py-2 md:py-3 border-b border-border flex-shrink-0">
          <p className="text-xs md:text-sm lg:text-base text-muted-foreground mb-1.5 uppercase tracking-wide">
            Current chords ({currentChords.length}/{MAX_CHORDS})
          </p>
          <div className="flex flex-wrap gap-1.5 md:gap-2">
            {currentChords.map((chord) => (
              <span
                key={chord}
                className="inline-flex items-center gap-1 px-2 md:px-3 lg:px-4 py-1 md:py-1.5 lg:py-2 rounded-lg bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 text-sm md:text-base lg:text-xl font-mono font-bold border border-amber-300 dark:border-amber-700"
              >
                {chord}
                <button
                  onClick={() => onRemoveChord(chord)}
                  className="text-amber-500 hover:text-red-500 transition-colors ml-0.5"
                  aria-label={`Remove ${chord}`}
                >
                  <X className="w-3 h-3 md:w-4 md:h-4 lg:w-5 lg:h-5" />
                </button>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Max reached banner */}
      {isAtMax && (
        <div className="px-3 md:px-4 py-2 md:py-3 bg-amber-50 dark:bg-amber-900/20 border-b border-amber-200 dark:border-amber-800 flex-shrink-0">
          <p className="text-xs md:text-sm lg:text-base text-amber-700 dark:text-amber-400 text-center font-medium">
            Maximum {MAX_CHORDS} chords reached — remove one to add another
          </p>
        </div>
      )}

      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Search */}
        <div className="p-2 md:p-3 lg:p-4 flex-shrink-0">
          <Input
            ref={searchRef}
            type="text"
            value={query}
            onChange={e => { setQuery(e.target.value); setRootFilter(''); setQualityFilter(''); }}
            placeholder="Search or type slash chord (C/E)..."
            className="focus-visible:ring-amber-400 h-11 md:h-14 lg:h-16 text-base md:text-lg lg:text-2xl"
            disabled={isAtMax}
          />
        </div>

        {/* Root selected: back button + quality filters */}
        {(rootFilter || query) && (
          <>
            {rootFilter && (
              <div className="px-2 md:px-3 pb-1 flex items-center gap-2 flex-shrink-0">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => { setRootFilter(''); setQualityFilter(''); }}
                  className="text-xs md:text-sm lg:text-base h-7 md:h-9 lg:h-12 px-2 md:px-3 lg:px-5 text-muted-foreground"
                >
                  ← Back
                </Button>
                <span className="text-base md:text-xl lg:text-3xl font-bold font-mono text-amber-600">{rootFilter}</span>
              </div>
            )}
            <div className="px-2 md:px-3 pb-2 flex flex-wrap gap-1 md:gap-1.5 flex-shrink-0">
              {['m','7','maj7','m7','sus2','sus4','dim','aug','add9'].map(q => (
                <Button
                  key={q}
                  size="sm"
                  variant={qualityFilter === q ? 'default' : 'outline'}
                  onClick={() => { setQualityFilter(qualityFilter === q ? '' : q); setQuery(''); }}
                  className={`px-2 md:px-3 lg:px-5 h-7 md:h-10 lg:h-12 text-sm md:text-base lg:text-xl ${qualityFilter === q ? 'bg-blue-500 hover:bg-blue-600 border-blue-500 text-white' : ''}`}
                >
                  {q}
                </Button>
              ))}
            </div>
          </>
        )}

        {/* Home screen: recent + favorites + root selector */}
        {!query && !rootFilter && (
          <div className="flex-1 overflow-y-auto px-2 md:px-3 lg:px-4 pb-2 flex flex-col gap-3 md:gap-4">
            {recentlyUsed.length > 0 && (
              <div>
                <p className="text-muted-foreground text-xs md:text-sm lg:text-base mb-1 md:mb-2 uppercase tracking-wide">Recent</p>
                <div className="flex flex-wrap gap-1 md:gap-2">
                  {recentlyUsed.map(chord => (
                    <Button
                      key={chord}
                      size="sm"
                      variant="outline"
                      onClick={() => handleSelect(chord)}
                      disabled={isAtMax || currentChords.includes(chord)}
                      className="px-3 md:px-4 lg:px-6 h-auto py-1.5 md:py-2 lg:py-3 text-base md:text-xl lg:text-2xl font-mono text-amber-600 hover:border-amber-400"
                    >
                      {chord}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {favorites.length > 0 && (
              <div>
                <p className="text-muted-foreground text-xs md:text-sm lg:text-base mb-1 md:mb-2 uppercase tracking-wide">Favorites ★</p>
                <div className="flex flex-wrap gap-1 md:gap-2">
                  {favorites.map(chord => (
                    <Button
                      key={chord}
                      size="sm"
                      variant="outline"
                      onClick={() => handleSelect(chord)}
                      disabled={isAtMax || currentChords.includes(chord)}
                      className="px-3 md:px-4 lg:px-6 h-auto py-1.5 md:py-2 lg:py-3 text-base md:text-xl lg:text-2xl font-mono text-yellow-600 hover:border-yellow-400"
                    >
                      {chord}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            <div>
              <p className="text-muted-foreground text-xs md:text-sm lg:text-base mb-2 md:mb-3 uppercase tracking-wide">Pick a root note</p>
              <div className="grid grid-cols-4 gap-2 md:gap-3">
                {['C','D','E','F','G','A','B','C#','D#','F#','G#','A#'].map(root => (
                  <button
                    key={root}
                    onClick={() => !isAtMax && setRootFilter(root)}
                    disabled={isAtMax}
                    className="flex items-center justify-center py-4 md:py-6 lg:py-8 text-xl md:text-2xl lg:text-4xl font-mono font-bold rounded-xl border border-border bg-card hover:border-amber-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
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
          <div className="flex-1 overflow-y-auto px-2 md:px-3 pb-2">
            {isSlashChord && !isAtMax && (
              <button
                onClick={() => handleSelect(query.trim())}
                className="w-full mb-2 flex items-center justify-center py-3 md:py-4 lg:py-6 text-base md:text-xl lg:text-2xl font-mono font-bold rounded-lg border-2 border-amber-400 bg-amber-50 dark:bg-amber-900/20 text-amber-700 hover:bg-amber-100 transition-colors"
              >
                Use "{query.trim()}"
              </button>
            )}
            <div className="grid grid-cols-3 gap-1 md:gap-2">
              {filteredChords.map(chord => {
                const alreadyAdded = currentChords.includes(chord);
                return (
                  <button
                    key={chord}
                    onClick={() => !alreadyAdded && handleSelect(chord)}
                    disabled={isAtMax && !alreadyAdded}
                    className={`relative flex items-center justify-center px-1 py-3 md:py-5 lg:py-7 text-base md:text-xl lg:text-2xl font-mono rounded-lg border transition-colors
                      ${alreadyAdded
                        ? 'border-amber-400 bg-amber-50 dark:bg-amber-900/20 text-amber-600 cursor-default'
                        : 'border-border bg-card hover:border-amber-400 hover:text-amber-600 disabled:opacity-40 disabled:cursor-not-allowed'
                      }`}
                  >
                    <span>{chord}</span>
                    {!alreadyAdded && (
                      <button
                        onClick={e => toggleFavorite(chord, e)}
                        className="absolute top-0.5 right-0.5 text-xs md:text-sm opacity-40 hover:opacity-100 transition-opacity"
                        aria-label={favorites.includes(chord) ? 'Unfavorite' : 'Favorite'}
                      >
                        {favorites.includes(chord) ? '★' : '☆'}
                      </button>
                    )}
                  </button>
                );
              })}
            </div>
            {filteredChords.length === 0 && (
              <p className="text-muted-foreground text-sm md:text-base lg:text-xl text-center py-4 md:py-6">No chords found</p>
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
          style={{ height: '80vh', maxHeight: '80vh' }}
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
      <div className="fixed right-4 top-20 bottom-4 w-96 lg:w-[520px] z-50 bg-card rounded-2xl shadow-2xl border border-border flex flex-col overflow-hidden">
        {content}
      </div>
    </>
  );
}
