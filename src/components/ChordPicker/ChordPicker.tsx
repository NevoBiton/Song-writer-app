import React, { useState, useEffect, useRef } from 'react';
import { ALL_CHORDS, searchChords, getChordsByQuality, RECENTLY_USED_KEY, FAVORITES_KEY } from '../../data/chords';
import ChordDiagram from '../ChordDiagram/ChordDiagram';

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
  const [preview, setPreview] = useState<string | null>(currentChord || null);
  const [recentlyUsed, setRecentlyUsed] = useState<string[]>(() => loadList(RECENTLY_USED_KEY));
  const [favorites, setFavorites] = useState<string[]>(() => loadList(FAVORITES_KEY));
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setPreview(currentChord || null);
      setTimeout(() => searchRef.current?.focus(), 100);
    }
  }, [isOpen, currentChord]);

  // Filtered chord list
  const filteredChords: string[] = (() => {
    let chords = ALL_CHORDS;
    if (query) return searchChords(query);
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
    setPreview(chord);
  }

  function handleConfirm() {
    if (!preview) return;
    // Update recently used
    const updated = [preview, ...recentlyUsed.filter(c => c !== preview)].slice(0, 8);
    setRecentlyUsed(updated);
    saveList(RECENTLY_USED_KEY, updated);
    onSelect(preview);
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

  // Escape to close
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
      <div className="flex items-center justify-between p-3 border-b border-gray-700 flex-shrink-0">
        {isMobile && (
          <div className="w-10 h-1 bg-gray-600 rounded-full mx-auto absolute left-1/2 -translate-x-1/2 top-2" />
        )}
        <h2 className="text-white font-bold text-lg">Pick a Chord</h2>
        <div className="flex gap-2">
          {onRemove && currentChord && (
            <button
              onClick={() => { onRemove(); onClose(); }}
              className="px-3 py-1.5 text-sm bg-red-800 hover:bg-red-700 text-white rounded-lg touch-target"
              aria-label="Remove chord"
            >
              Remove
            </button>
          )}
          <button onClick={onClose} className="text-gray-400 hover:text-white p-1 touch-target" aria-label="Close">
            ✕
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Left: chord list */}
        <div className="flex flex-col flex-1 overflow-hidden">
          {/* Search */}
          <div className="p-2 flex-shrink-0">
            <input
              ref={searchRef}
              type="text"
              value={query}
              onChange={e => { setQuery(e.target.value); setRootFilter(''); setQualityFilter(''); }}
              placeholder="Search chords... (Am, G7, Dm...)"
              className="w-full bg-gray-800 text-white rounded-lg px-3 py-2 text-sm border border-gray-700 focus:border-amber-400 focus:outline-none"
            />
          </div>

          {/* Root filters */}
          <div className="px-2 pb-1 flex flex-wrap gap-1 flex-shrink-0">
            {['C','D','E','F','G','A','B','C#','D#','F#','G#','A#'].map(root => (
              <button
                key={root}
                onClick={() => { setRootFilter(rootFilter === root ? '' : root); setQuery(''); }}
                className={`px-2 py-0.5 text-xs rounded-md font-mono transition-colors ${
                  rootFilter === root
                    ? 'bg-amber-500 text-black'
                    : 'bg-gray-700 text-gray-200 hover:bg-gray-600'
                }`}
              >
                {root}
              </button>
            ))}
          </div>

          {/* Quality filters */}
          <div className="px-2 pb-2 flex flex-wrap gap-1 flex-shrink-0">
            {['m','7','maj7','m7','sus2','sus4','dim','aug','add9'].map(q => (
              <button
                key={q}
                onClick={() => { setQualityFilter(qualityFilter === q ? '' : q); setQuery(''); }}
                className={`px-2 py-0.5 text-xs rounded-md transition-colors ${
                  qualityFilter === q
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                {q}
              </button>
            ))}
          </div>

          {/* Recently used */}
          {!query && !rootFilter && !qualityFilter && recentlyUsed.length > 0 && (
            <div className="px-2 pb-1 flex-shrink-0">
              <p className="text-gray-500 text-xs mb-1 uppercase tracking-wide">Recent</p>
              <div className="flex flex-wrap gap-1">
                {recentlyUsed.map(chord => (
                  <button
                    key={chord}
                    onClick={() => handleSelect(chord)}
                    className={`px-2 py-1 text-sm font-mono rounded-md border ${
                      preview === chord
                        ? 'bg-amber-500 text-black border-amber-400'
                        : 'bg-gray-800 text-amber-400 border-gray-600 hover:border-amber-500'
                    }`}
                  >
                    {chord}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Favorites */}
          {!query && !rootFilter && favorites.length > 0 && (
            <div className="px-2 pb-1 flex-shrink-0">
              <p className="text-gray-500 text-xs mb-1 uppercase tracking-wide">Favorites ★</p>
              <div className="flex flex-wrap gap-1">
                {favorites.map(chord => (
                  <button
                    key={chord}
                    onClick={() => handleSelect(chord)}
                    className={`px-2 py-1 text-sm font-mono rounded-md border ${
                      preview === chord
                        ? 'bg-amber-500 text-black border-amber-400'
                        : 'bg-gray-800 text-yellow-300 border-gray-600 hover:border-yellow-400'
                    }`}
                  >
                    {chord}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Chord grid */}
          <div className="flex-1 overflow-y-auto px-2 pb-2">
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-1">
              {filteredChords.map(chord => (
                <button
                  key={chord}
                  onClick={() => handleSelect(chord)}
                  className={`relative flex items-center justify-center px-1 py-2 text-sm font-mono rounded-lg border transition-colors ${
                    preview === chord
                      ? 'bg-amber-500 text-black border-amber-400 font-bold'
                      : 'bg-gray-800 text-gray-200 border-gray-700 hover:border-amber-500 hover:text-amber-300'
                  }`}
                >
                  <span>{chord}</span>
                  <button
                    onClick={e => toggleFavorite(chord, e)}
                    className="absolute top-0.5 right-0.5 text-xs opacity-50 hover:opacity-100"
                    aria-label={favorites.includes(chord) ? 'Unfavorite' : 'Favorite'}
                  >
                    {favorites.includes(chord) ? '★' : '☆'}
                  </button>
                </button>
              ))}
            </div>
            {filteredChords.length === 0 && (
              <p className="text-gray-500 text-sm text-center py-4">No chords found</p>
            )}
          </div>
        </div>

        {/* Right: diagram + confirm */}
        <div className="w-40 md:w-52 flex-shrink-0 border-l border-gray-700 flex flex-col items-center justify-between p-3 gap-3">
          {preview ? (
            <>
              <ChordDiagram chordName={preview} size="md" />
              <button
                onClick={handleConfirm}
                className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-black font-bold rounded-xl transition-colors touch-target"
              >
                Use {preview}
              </button>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-600 text-xs text-center">
              Select a chord to preview
            </div>
          )}
        </div>
      </div>
    </div>
  );

  if (isMobile) {
    return (
      <>
        {/* Backdrop */}
        {isOpen && (
          <div className="fixed inset-0 bg-black/50 z-40" onClick={onClose} />
        )}
        {/* Bottom sheet */}
        <div
          className={`bottom-sheet ${isOpen ? 'bottom-sheet-open' : 'bottom-sheet-closed'}`}
          style={{ height: '75vh', maxHeight: '75vh' }}
        >
          <div className="absolute top-2 left-1/2 -translate-x-1/2 w-10 h-1 bg-gray-600 rounded-full" />
          <div className="pt-4 h-full flex flex-col">
            {content}
          </div>
        </div>
      </>
    );
  }

  // Desktop: side panel / floating panel
  if (!isOpen) return null;
  return (
    <>
      <div className="fixed inset-0 bg-black/30 z-40" onClick={onClose} />
      <div className="fixed right-4 top-16 bottom-4 w-96 z-50 bg-gray-900 rounded-2xl shadow-2xl border border-gray-700 flex flex-col overflow-hidden">
        {content}
      </div>
    </>
  );
}
