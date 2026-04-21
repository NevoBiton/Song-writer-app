import React, { useState, useEffect, useRef } from 'react';
import { X, ArrowLeft } from 'lucide-react';
import { searchChords, RECENTLY_USED_KEY, FAVORITES_KEY } from '../../data/chords';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useUILanguage } from '@/context/UILanguageContext';

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

function getLevel2Chords(root: string): string[] {
  return [
    root,
    `${root}m`,
    `${root}#`,
    `${root}#m`,
    `${root}b`,
    `${root}bm`,
    `${root}dim`,
    `${root}aug`,
  ];
}

export default function ChordPicker({ isOpen, onClose, onSelect, onRemoveChord, currentChords, isMobile }: Props) {
  const { t } = useUILanguage();
  const [query, setQuery] = useState('');
  const [rootFilter, setRootFilter] = useState('');
  const [recentlyUsed, setRecentlyUsed] = useState<string[]>(() => loadList(RECENTLY_USED_KEY));
  const [favorites, setFavorites] = useState<string[]>(() => loadList(FAVORITES_KEY));
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setRootFilter('');
      setTimeout(() => searchRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const isAtMax = currentChords.length >= MAX_CHORDS;
  const isSlashChord = /^[A-G][#b]?[a-zA-Z0-9]*\/[A-G][#b]?$/.test(query.trim());
  const searchResults = query ? searchChords(query) : [];

  function handleSelect(chord: string) {
    if (isAtMax) return;
    const updated = [chord, ...recentlyUsed.filter(c => c !== chord)].slice(0, 10);
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
      if (e.key === 'Escape') {
        if (rootFilter) { setRootFilter(''); return; }
        onClose();
      }
    }
    if (isOpen) document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isOpen, onClose, rootFilter]);

  const level2Chords = getLevel2Chords(rootFilter);

  const content = (
    <div className="flex flex-col h-full max-h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-3 md:p-4 border-b border-border flex-shrink-0">
        {isMobile && (
          <div className="w-10 h-1 bg-border rounded-full mx-auto absolute left-1/2 -translate-x-1/2 top-2" />
        )}
        {rootFilter ? (
          <button
            onClick={() => setRootFilter('')}
            className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors text-sm font-medium"
          >
            <ArrowLeft className="w-4 h-4" />
            {t.pickAChord}
          </button>
        ) : (
          <h2 className="text-foreground font-bold text-base md:text-xl">{t.pickAChord}</h2>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="text-muted-foreground h-8 w-8 md:h-10 md:w-10"
        >
          <X className="w-4 h-4 md:w-5 md:h-5" />
        </Button>
      </div>

      {/* Current chords row */}
      {currentChords.length > 0 && (
        <div className="px-3 md:px-4 py-2 border-b border-border flex-shrink-0">
          <p className="text-xs text-muted-foreground mb-1.5 uppercase tracking-wide">
            {t.currentChordsLabel} ({currentChords.length}/{MAX_CHORDS})
          </p>
          <div className="flex flex-wrap gap-1.5">
            {currentChords.map((chord) => (
              <span
                key={chord}
                className="inline-flex items-center gap-1 px-2 md:px-3 py-1 md:py-1.5 rounded-lg bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 text-sm md:text-base font-mono font-bold border border-amber-300 dark:border-amber-700"
              >
                {chord}
                <button
                  onClick={() => onRemoveChord(chord)}
                  className="text-amber-500 hover:text-red-500 transition-colors ml-0.5"
                  aria-label={`Remove ${chord}`}
                >
                  <X className="w-3 h-3 md:w-4 md:h-4" />
                </button>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Max reached banner */}
      {isAtMax && (
        <div className="px-3 py-2 bg-amber-50 dark:bg-amber-900/20 border-b border-amber-200 dark:border-amber-800 flex-shrink-0">
          <p className="text-xs md:text-sm text-amber-700 dark:text-amber-400 text-center font-medium">
            {t.maxChordsReached}
          </p>
        </div>
      )}

      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Search — only on home screen */}
        {!rootFilter && (
          <div className="p-2 md:p-3 flex-shrink-0">
            <Input
              ref={searchRef}
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder={t.chordSearchPlaceholder}
              className="focus-visible:ring-amber-400 h-10 md:h-12 text-base md:text-lg"
              disabled={isAtMax}
            />
          </div>
        )}

        {/* ── LEVEL 2: root selected ─────────────────────────────── */}
        {rootFilter && (
          <div className="flex-1 overflow-y-auto px-3 md:px-4 py-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-3">
              {rootFilter}
            </p>
            <div className="grid grid-cols-2 gap-3 md:gap-4">
              {level2Chords.map(chord => {
                const alreadyAdded = currentChords.includes(chord);
                const isFav = favorites.includes(chord);
                return (
                  <button
                    key={chord}
                    onClick={() => !alreadyAdded && handleSelect(chord)}
                    disabled={isAtMax && !alreadyAdded}
                    className={`relative flex items-center justify-center py-6 md:py-8 text-2xl md:text-3xl font-mono font-bold rounded-2xl border-2 transition-all
                      ${alreadyAdded
                        ? 'border-amber-400 bg-amber-50 dark:bg-amber-900/20 text-amber-600 cursor-default'
                        : 'border-border bg-card hover:border-amber-400 hover:text-amber-600 hover:bg-amber-50/50 dark:hover:bg-amber-900/10 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed'
                      }`}
                  >
                    {chord}
                    {!alreadyAdded && (
                      <button
                        onClick={e => toggleFavorite(chord, e)}
                        className="absolute top-1.5 right-1.5 text-sm opacity-40 hover:opacity-100 transition-opacity"
                        aria-label={isFav ? 'Unfavorite' : 'Favorite'}
                      >
                        {isFav ? '★' : '☆'}
                      </button>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ── SEARCH RESULTS ─────────────────────────────────────── */}
        {!rootFilter && query && (
          <div className="flex-1 overflow-y-auto px-2 md:px-3 pb-2">
            {isSlashChord && !isAtMax && (
              <button
                onClick={() => handleSelect(query.trim())}
                className="w-full mb-2 flex items-center justify-center py-3 md:py-4 text-base md:text-xl font-mono font-bold rounded-lg border-2 border-amber-400 bg-amber-50 dark:bg-amber-900/20 text-amber-700 hover:bg-amber-100 transition-colors"
              >
                Use &ldquo;{query.trim()}&rdquo;
              </button>
            )}
            <div className="grid grid-cols-3 gap-1.5 md:gap-2">
              {searchResults.map(chord => {
                const alreadyAdded = currentChords.includes(chord);
                return (
                  <button
                    key={chord}
                    onClick={() => !alreadyAdded && handleSelect(chord)}
                    disabled={isAtMax && !alreadyAdded}
                    className={`relative flex items-center justify-center px-1 py-3 md:py-4 text-base md:text-xl font-mono rounded-xl border transition-colors
                      ${alreadyAdded
                        ? 'border-amber-400 bg-amber-50 dark:bg-amber-900/20 text-amber-600 cursor-default'
                        : 'border-border bg-card hover:border-amber-400 hover:text-amber-600 disabled:opacity-40 disabled:cursor-not-allowed'
                      }`}
                  >
                    <span>{chord}</span>
                    {!alreadyAdded && (
                      <button
                        onClick={e => toggleFavorite(chord, e)}
                        className="absolute top-0.5 right-0.5 text-xs opacity-40 hover:opacity-100 transition-opacity"
                        aria-label={favorites.includes(chord) ? 'Unfavorite' : 'Favorite'}
                      >
                        {favorites.includes(chord) ? '★' : '☆'}
                      </button>
                    )}
                  </button>
                );
              })}
            </div>
            {searchResults.length === 0 && (
              <p className="text-muted-foreground text-sm md:text-base text-center py-6">{t.noChordsFound}</p>
            )}
          </div>
        )}

        {/* ── HOME SCREEN: recent + favorites + root grid ────────── */}
        {!rootFilter && !query && (
          <div className="flex-1 overflow-y-auto px-3 md:px-4 pb-3 flex flex-col gap-4">
            {recentlyUsed.length > 0 && (
              <div>
                <p className="text-muted-foreground text-xs uppercase tracking-wide mb-2">{t.recentChords}</p>
                <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${Math.min(recentlyUsed.length, 5)}, 1fr)` }}>
                  {recentlyUsed.map(chord => (
                    <button
                      key={chord}
                      onClick={() => handleSelect(chord)}
                      disabled={isAtMax || currentChords.includes(chord)}
                      className="flex items-center justify-center py-2.5 text-base md:text-lg font-mono font-bold text-amber-600 rounded-xl border border-border hover:border-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {chord}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {favorites.length > 0 && (
              <div>
                <p className="text-muted-foreground text-xs uppercase tracking-wide mb-2">{t.favoritesLabel} ★</p>
                <div className="flex flex-wrap gap-1.5">
                  {favorites.map(chord => (
                    <Button
                      key={chord}
                      size="sm"
                      variant="outline"
                      onClick={() => handleSelect(chord)}
                      disabled={isAtMax || currentChords.includes(chord)}
                      className="px-3 md:px-4 h-auto py-1.5 md:py-2 text-base md:text-xl font-mono text-yellow-600 hover:border-yellow-400"
                    >
                      {chord}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            <div>
              <p className="text-muted-foreground text-xs uppercase tracking-wide mb-2">{t.pickRootNote}</p>
              <div className="flex flex-col gap-2 md:gap-3">
                <div className="flex gap-2 md:gap-3">
                  {['C', 'D', 'E', 'F'].map(root => (
                    <button
                      key={root}
                      onClick={() => !isAtMax && setRootFilter(root)}
                      disabled={isAtMax}
                      className="flex-1 flex items-center justify-center py-5 md:py-7 text-2xl md:text-3xl font-mono font-bold rounded-2xl border-2 border-border bg-card hover:border-amber-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {root}
                    </button>
                  ))}
                </div>
                <div className="flex gap-2 md:gap-3">
                  {['G', 'A', 'B'].map(root => (
                    <button
                      key={root}
                      onClick={() => !isAtMax && setRootFilter(root)}
                      disabled={isAtMax}
                      className="flex-1 flex items-center justify-center py-5 md:py-7 text-2xl md:text-3xl font-mono font-bold rounded-2xl border-2 border-border bg-card hover:border-amber-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {root}
                    </button>
                  ))}
                </div>
              </div>
            </div>
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
      <div className="fixed right-4 top-20 bottom-4 w-96 lg:w-[480px] z-50 bg-card rounded-2xl shadow-2xl border border-border flex flex-col overflow-hidden">
        {content}
      </div>
    </>
  );
}
