import { useState, useEffect } from 'react';
import { Song, Section } from '../../types';
import { useSong } from '../../hooks/useSong';
import { sectionToPlainText } from '../../utils/chordParser';
import { getAllKeys } from '../../utils/transpose';
import ChordLine from './ChordLine';
import ChordPicker from '../ChordPicker/ChordPicker';

interface Props {
  song: Song;
  onSave: (song: Song) => void;
  onBack: () => void;
  isMobile: boolean;
}

type PickerTarget = {
  sectionId: string;
  lineId: string;
  tokenId: string;
  currentChord?: string;
} | null;

const SECTION_TYPE_COLORS: Record<Section['type'], string> = {
  verse: 'text-blue-400',
  chorus: 'text-amber-400',
  bridge: 'text-purple-400',
  intro: 'text-green-400',
  outro: 'text-red-400',
  custom: 'text-gray-400',
};

const SECTION_TYPES: Section['type'][] = ['verse', 'chorus', 'bridge', 'intro', 'outro', 'custom'];

export default function SongEditor({ song: initialSong, onSave, onBack, isMobile }: Props) {
  const {
    song,
    undo, redo, canUndo, canRedo,
    savedIndicator,
    addChordToToken,
    removeChordFromToken,
    updateSectionLabel,
    updateSectionType,
    addSection,
    removeSection,
    setLyrics,
    updateTitle,
    updateArtist,
    updateKey,
    updateCapo,
    updateLanguage,
    transpose,
  } = useSong(initialSong, onSave);

  const [editingSectionId, setEditingSectionId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [pickerTarget, setPickerTarget] = useState<PickerTarget>(null);
  const [previewMode, setPreviewMode] = useState(false);
  const [showChords, setShowChords] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [autoScroll, setAutoScroll] = useState(false);
  const [fontSize, setFontSize] = useState(18);

  // Check if the song has any lyrics at all
  const hasLyrics = song.sections.some(s => s.lines.some(l => l.tokens.some(t => !t.isSpace && t.text.trim())));
  const hasChords = song.sections.some(s => s.lines.some(l => l.tokens.some(t => t.chord)));

  // Auto-scroll in preview mode
  useEffect(() => {
    if (!autoScroll || !previewMode) return;
    const interval = setInterval(() => {
      window.scrollBy({ top: 1, behavior: 'smooth' });
    }, 50);
    return () => clearInterval(interval);
  }, [autoScroll, previewMode]);

  // Keyboard shortcuts
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') { e.preventDefault(); undo(); }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.shiftKey && e.key === 'z'))) { e.preventDefault(); redo(); }
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [undo, redo]);

  function startEditSection(section: Section) {
    setEditingSectionId(section.id);
    setEditText(sectionToPlainText(section.lines));
  }

  function finishEdit(sectionId: string) {
    setLyrics(sectionId, editText);
    setEditingSectionId(null);
  }

  function handleTokenClick(sectionId: string, lineId: string, tokenId: string, currentChord?: string) {
    if (previewMode) return;
    setPickerTarget({ sectionId, lineId, tokenId, currentChord });
  }

  function handleChordSelect(chord: string) {
    if (!pickerTarget) return;
    addChordToToken(pickerTarget.sectionId, pickerTarget.lineId, pickerTarget.tokenId, chord);
  }

  function handleChordRemove() {
    if (!pickerTarget) return;
    removeChordFromToken(pickerTarget.sectionId, pickerTarget.lineId, pickerTarget.tokenId);
  }

  function exportChordPro(): string {
    const lines: string[] = [];
    lines.push(`{title: ${song.title}}`);
    if (song.artist) lines.push(`{artist: ${song.artist}}`);
    if (song.key) lines.push(`{key: ${song.key}}`);
    lines.push('');
    for (const section of song.sections) {
      const typeMap: Record<Section['type'], [string, string]> = {
        verse: ['sov', 'eov'], chorus: ['soc', 'eoc'], bridge: ['sob', 'eob'],
        intro: ['sov', 'eov'], outro: ['sov', 'eov'], custom: ['sov', 'eov'],
      };
      const [start, end] = typeMap[section.type];
      lines.push(`{${start}}`);
      if (section.label) lines.push(`{c: ${section.label}}`);
      for (const line of section.lines) {
        lines.push(line.tokens.map(t => `${t.chord ? `[${t.chord}]` : ''}${t.text}`).join(''));
      }
      lines.push(`{${end}}`);
      lines.push('');
    }
    return lines.join('\n');
  }

  const allKeys = getAllKeys();

  return (
    <div className="flex flex-col h-screen bg-gray-950">

      {/* ── Toolbar ───────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 px-3 py-2 bg-gray-900 border-b border-gray-800 flex-shrink-0">
        <button onClick={onBack} className="text-gray-400 hover:text-white p-2 touch-target rounded-lg" aria-label="Back to library">
          ← Back
        </button>

        <div className="flex-1 min-w-0 ml-1">
          <div className="text-white font-semibold truncate text-sm">{song.title || 'Untitled'}</div>
          {song.artist && <div className="text-gray-500 text-xs truncate">{song.artist}</div>}
        </div>

        {savedIndicator && (
          <span className="text-green-400 text-xs flex-shrink-0 bg-green-400/10 px-2 py-1 rounded-lg">Saved ✓</span>
        )}

        <div className="flex items-center gap-1 flex-shrink-0">
          {!previewMode && (
            <>
              <button onClick={undo} disabled={!canUndo} className="p-1.5 text-gray-400 hover:text-white disabled:opacity-30 touch-target" title="Undo (Ctrl+Z)">↩</button>
              <button onClick={redo} disabled={!canRedo} className="p-1.5 text-gray-400 hover:text-white disabled:opacity-30 touch-target" title="Redo">↪</button>
            </>
          )}
          <button
            onClick={() => setShowSettings(s => !s)}
            className={`p-1.5 touch-target rounded-lg transition-colors ${showSettings ? 'text-amber-400 bg-amber-400/10' : 'text-gray-400 hover:text-white'}`}
            title="Song settings"
          >
            ⚙
          </button>

          {/* Mode toggle — clearly visible */}
          <button
            onClick={() => setPreviewMode(m => !m)}
            className={`px-3 py-1.5 text-sm font-semibold rounded-lg touch-target transition-colors ml-1 ${
              previewMode
                ? 'bg-blue-600 hover:bg-blue-500 text-white'
                : 'bg-amber-500 hover:bg-amber-400 text-black'
            }`}
          >
            {previewMode ? '✎ Edit' : '▶ View'}
          </button>
        </div>
      </div>

      {/* ── How-to hint (edit mode, no lyrics yet) ─────────────────── */}
      {!previewMode && !hasLyrics && (
        <div className="bg-blue-900/30 border-b border-blue-800/40 px-4 py-3 flex-shrink-0">
          <p className="text-blue-300 text-sm font-semibold mb-1">How to use:</p>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-blue-200">
            <span>① Click <strong>"Add lyrics"</strong> below → type your song</span>
            <span>② Click any <strong>word</strong> → pick a chord that appears above it</span>
            <span>③ Click <strong>"View"</strong> to see the final result</span>
          </div>
        </div>
      )}

      {/* ── Chord tip (lyrics exist, no chords yet) ─────────────────── */}
      {!previewMode && hasLyrics && !hasChords && (
        <div className="bg-amber-900/20 border-b border-amber-800/30 px-4 py-2 flex-shrink-0">
          <p className="text-amber-300 text-xs">
            💡 <strong>Tap any word</strong> in your lyrics to add a chord above it
          </p>
        </div>
      )}

      {/* ── Settings panel ───────────────────────────────────────── */}
      {showSettings && (
        <div className="bg-gray-900 border-b border-gray-800 px-3 py-3 flex-shrink-0">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            <div>
              <label className="text-gray-400 text-xs block mb-1">Title</label>
              <input
                value={song.title}
                onChange={e => updateTitle(e.target.value)}
                className="w-full bg-gray-800 text-white rounded px-2 py-1 text-sm border border-gray-700 focus:border-amber-400 focus:outline-none"
              />
            </div>
            <div>
              <label className="text-gray-400 text-xs block mb-1">Artist</label>
              <input
                value={song.artist || ''}
                onChange={e => updateArtist(e.target.value)}
                className="w-full bg-gray-800 text-white rounded px-2 py-1 text-sm border border-gray-700 focus:border-amber-400 focus:outline-none"
              />
            </div>
            <div>
              <label className="text-gray-400 text-xs block mb-1">Key</label>
              <select
                value={song.key || ''}
                onChange={e => updateKey(e.target.value)}
                className="w-full bg-gray-800 text-white rounded px-2 py-1 text-sm border border-gray-700 focus:outline-none"
              >
                <option value="">—</option>
                {allKeys.map(k => <option key={k} value={k}>{k}</option>)}
              </select>
            </div>
            <div>
              <label className="text-gray-400 text-xs block mb-1">Capo</label>
              <input
                type="number" min={0} max={12}
                value={song.capo ?? 0}
                onChange={e => updateCapo(Number(e.target.value))}
                className="w-full bg-gray-800 text-white rounded px-2 py-1 text-sm border border-gray-700 focus:outline-none"
              />
            </div>
          </div>
          <div className="flex flex-wrap gap-3 mt-3 items-center">
            <div>
              <label className="text-gray-400 text-xs block mb-1">Language</label>
              <select
                value={song.language}
                onChange={e => updateLanguage(e.target.value as Song['language'])}
                className="bg-gray-800 text-white rounded px-2 py-1 text-sm border border-gray-700 focus:outline-none"
              >
                <option value="en">English</option>
                <option value="he">Hebrew / עברית</option>
                <option value="mixed">Mixed</option>
              </select>
            </div>
            <div>
              <label className="text-gray-400 text-xs block mb-1">Transpose</label>
              <div className="flex gap-1">
                <button onClick={() => transpose(-1)} className="px-2 py-1 bg-gray-700 hover:bg-gray-600 text-white rounded text-sm touch-target">−1</button>
                <button onClick={() => transpose(1)} className="px-2 py-1 bg-gray-700 hover:bg-gray-600 text-white rounded text-sm touch-target">+1</button>
              </div>
            </div>
            <div>
              <label className="text-gray-400 text-xs block mb-1">Export</label>
              <button
                onClick={() => navigator.clipboard.writeText(exportChordPro())}
                className="px-2 py-1 bg-gray-700 hover:bg-gray-600 text-white rounded text-sm touch-target"
              >
                Copy ChordPro
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Preview controls ─────────────────────────────────────── */}
      {previewMode && (
        <div className="bg-gray-900 border-b border-gray-800 px-3 py-2 flex items-center gap-4 flex-shrink-0">
          <label className="flex items-center gap-1.5 text-gray-300 text-sm cursor-pointer">
            <input type="checkbox" checked={showChords} onChange={e => setShowChords(e.target.checked)} className="accent-amber-400" />
            Show chords
          </label>
          <label className="flex items-center gap-1.5 text-gray-300 text-sm cursor-pointer">
            <input type="checkbox" checked={autoScroll} onChange={e => setAutoScroll(e.target.checked)} className="accent-amber-400" />
            Auto-scroll
          </label>
          <div className="flex items-center gap-2 ml-auto">
            <span className="text-gray-500 text-xs">A</span>
            <input
              type="range" min={14} max={28} value={fontSize}
              onChange={e => setFontSize(Number(e.target.value))}
              className="w-20 accent-amber-400"
            />
            <span className="text-gray-200 text-base font-semibold">A</span>
          </div>
        </div>
      )}

      {/* ── Main content ─────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-4 py-4" style={{ fontSize: previewMode ? fontSize : undefined }}>
        {song.sections.map(section => (
          <div key={section.id} className="mb-8">
            {/* Section header */}
            <div className="flex items-center gap-2 mb-2">
              {!previewMode ? (
                <>
                  <select
                    value={section.type}
                    onChange={e => updateSectionType(section.id, e.target.value as Section['type'])}
                    className={`text-xs font-bold uppercase bg-transparent border-none focus:outline-none cursor-pointer ${SECTION_TYPE_COLORS[section.type]}`}
                  >
                    {SECTION_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                  <input
                    value={section.label || ''}
                    onChange={e => updateSectionLabel(section.id, e.target.value)}
                    className="text-gray-300 text-sm bg-transparent border-none focus:outline-none flex-1"
                    placeholder="Label..."
                  />
                  {song.sections.length > 1 && (
                    <button
                      onClick={() => removeSection(section.id)}
                      className="text-gray-600 hover:text-red-400 text-xs px-1 touch-target"
                      title="Remove section"
                    >
                      ✕
                    </button>
                  )}
                </>
              ) : (
                <span className={`text-sm font-bold uppercase tracking-wide ${SECTION_TYPE_COLORS[section.type]}`}>
                  {section.label || section.type}
                </span>
              )}
            </div>

            {/* Section content */}
            {!previewMode && editingSectionId === section.id ? (
              /* Lyrics textarea */
              <textarea
                value={editText}
                onChange={e => setEditText(e.target.value)}
                onBlur={() => finishEdit(section.id)}
                autoFocus
                dir={song.language === 'he' ? 'rtl' : 'auto'}
                className="w-full bg-gray-800 text-gray-100 rounded-xl px-3 py-2.5 text-base border-2 border-amber-400 focus:outline-none resize-none min-h-[100px] leading-relaxed"
                placeholder={song.language === 'he' ? 'הקלד מילות השיר כאן...' : 'Type your lyrics here, one line per line...'}
              />
            ) : (
              <div className="rounded-xl">
                {section.lines.length === 0 && !previewMode ? (
                  /* Empty section CTA */
                  <button
                    className="w-full border-2 border-dashed border-gray-700 hover:border-amber-500 rounded-xl py-5 text-center transition-colors group"
                    onClick={() => startEditSection(section)}
                  >
                    <div className="text-2xl mb-1">✍️</div>
                    <div className="text-amber-400 font-semibold text-sm group-hover:text-amber-300">
                      Add lyrics
                    </div>
                    <div className="text-gray-600 text-xs mt-0.5">Click to type your song words</div>
                  </button>
                ) : (
                  <>
                    {/* Chord lines */}
                    <div className={`px-1 ${!previewMode ? 'rounded-xl border border-transparent hover:border-gray-700 hover:bg-gray-900/40 cursor-pointer' : ''}`}>
                      {section.lines.map(line => (
                        <ChordLine
                          key={line.id}
                          line={line}
                          sectionId={section.id}
                          onTokenClick={handleTokenClick}
                          showChords={showChords}
                        />
                      ))}
                    </div>
                    {/* Edit lyrics button */}
                    {!previewMode && (
                      <button
                        className="mt-2 flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-500 hover:text-gray-300 bg-gray-800/50 hover:bg-gray-800 rounded-lg transition-colors touch-target"
                        onClick={() => startEditSection(section)}
                      >
                        ✎ Edit lyrics
                      </button>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        ))}

        {/* Add section buttons */}
        {!previewMode && (
          <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-gray-800">
            <span className="text-gray-500 text-xs self-center mr-1">+ Add section:</span>
            {(['verse', 'chorus', 'bridge', 'intro', 'outro'] as Section['type'][]).map(type => (
              <button
                key={type}
                onClick={() => addSection(type)}
                className="px-3 py-1.5 text-xs bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg capitalize touch-target border border-gray-700 hover:border-gray-500 transition-colors"
              >
                {type}
              </button>
            ))}
          </div>
        )}

        {/* Bottom padding so FAB doesn't cover last line */}
        {previewMode && <div className="h-20" />}
      </div>

      {/* ── Floating "Edit" button in view mode ───────────────────── */}
      {previewMode && (
        <div className="fixed bottom-6 right-6 z-30">
          <button
            onClick={() => setPreviewMode(false)}
            className="flex items-center gap-2 px-5 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-2xl shadow-2xl text-sm transition-colors touch-target"
          >
            ✎ Edit Song
          </button>
        </div>
      )}

      {/* ── Chord Picker ─────────────────────────────────────────── */}
      <ChordPicker
        isOpen={pickerTarget !== null}
        onClose={() => setPickerTarget(null)}
        onSelect={handleChordSelect}
        onRemove={pickerTarget?.currentChord ? handleChordRemove : undefined}
        currentChord={pickerTarget?.currentChord}
        isMobile={isMobile}
      />
    </div>
  );
}
