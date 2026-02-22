import { useState, useEffect, useRef, useCallback } from 'react';
import { ArrowLeft, Undo2, Redo2, Settings, Eye, Edit3, Plus, Share2, Check } from 'lucide-react';
import { Song, Section } from '../../types';
import { useSong } from '../../hooks/useSong';
import { sectionToPlainText } from '../../utils/chordParser';
import { getAllKeys } from '../../utils/transpose';
import ChordLine from './ChordLine';
import ChordPicker from '../ChordPicker/ChordPicker';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

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
  verse: 'text-blue-600',
  chorus: 'text-amber-600',
  bridge: 'text-purple-600',
  intro: 'text-green-600',
  outro: 'text-red-600',
  custom: 'text-gray-500',
};

const SECTION_BADGE_COLORS: Record<Section['type'], string> = {
  verse: 'bg-blue-50 text-blue-700 border-blue-200',
  chorus: 'bg-amber-50 text-amber-700 border-amber-200',
  bridge: 'bg-purple-50 text-purple-700 border-purple-200',
  intro: 'bg-green-50 text-green-700 border-green-200',
  outro: 'bg-red-50 text-red-700 border-red-200',
  custom: 'bg-gray-50 text-gray-600 border-gray-200',
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
  const [shareCopied, setShareCopied] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const hasLyrics = song.sections.some(s => s.lines.some(l => l.tokens.some(t => !t.isSpace && t.text.trim())));
  const hasChords = song.sections.some(s => s.lines.some(l => l.tokens.some(t => t.chord)));

  useEffect(() => {
    if (!autoScroll || !previewMode) return;
    const interval = setInterval(() => {
      window.scrollBy({ top: 1, behavior: 'smooth' });
    }, 50);
    return () => clearInterval(interval);
  }, [autoScroll, previewMode]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') { e.preventDefault(); undo(); }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.shiftKey && e.key === 'z'))) { e.preventDefault(); redo(); }
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [undo, redo]);

  // Auto-grow textarea when content changes
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [editText]);

  const shareSong = useCallback(() => {
    const lines: string[] = [`🎵 ${song.title}${song.artist ? ` — ${song.artist}` : ''}`, ''];
    for (const section of song.sections) {
      if (section.label) lines.push(`[ ${section.label} ]`);
      for (const line of section.lines) {
        const chordLine = line.tokens.map(t => (t.chord ? t.chord.padEnd(t.text.length || t.chord.length + 1) : ' '.repeat(Math.max(t.text.length, 1)))).join('');
        const lyricLine = line.tokens.map(t => t.text).join('');
        if (chordLine.trim()) lines.push(chordLine);
        if (lyricLine.trim()) lines.push(lyricLine);
      }
      lines.push('');
    }
    navigator.clipboard.writeText(lines.join('\n'));
    setShareCopied(true);
    setTimeout(() => setShareCopied(false), 2500);
  }, [song]);

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
    <div className="flex flex-col min-h-screen bg-background">

      {/* ── Toolbar ─────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 px-3 py-2 bg-card border-b border-border flex-shrink-0 shadow-sm">
        <Button variant="ghost" size="sm" onClick={onBack} className="gap-1.5 text-muted-foreground">
          <ArrowLeft className="w-4 h-4" />
          <span className="hidden sm:inline">Library</span>
        </Button>

        <div className="flex-1 min-w-0 ml-1">
          <div className="text-foreground font-semibold truncate text-sm">{song.title || 'Untitled'}</div>
          {song.artist && <div className="text-muted-foreground text-xs truncate">{song.artist}</div>}
        </div>

        {savedIndicator && (
          <Badge className="bg-green-100 text-green-700 border-green-200 text-xs flex-shrink-0">
            Saved ✓
          </Badge>
        )}

        <div className="flex items-center gap-1 flex-shrink-0">
          {!previewMode && (
            <>
              <Button variant="ghost" size="icon" onClick={undo} disabled={!canUndo} title="Undo (Ctrl+Z)" className="text-muted-foreground">
                <Undo2 className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="icon" onClick={redo} disabled={!canRedo} title="Redo" className="text-muted-foreground">
                <Redo2 className="w-4 h-4" />
              </Button>
            </>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowSettings(s => !s)}
            className={showSettings ? 'text-amber-500 bg-amber-50 dark:bg-amber-900/20' : 'text-muted-foreground'}
            title="Song settings"
          >
            <Settings className="w-4 h-4" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={shareSong}
            title="Copy song to clipboard"
            className="text-muted-foreground"
          >
            {shareCopied ? <Check className="w-4 h-4 text-green-500" /> : <Share2 className="w-4 h-4" />}
          </Button>

          <Button
            size="sm"
            onClick={() => setPreviewMode(m => !m)}
            className={`ml-1 gap-1.5 font-semibold border-0 ${
              previewMode
                ? 'bg-blue-600 hover:bg-blue-500 text-white'
                : 'bg-amber-400 hover:bg-amber-500 text-gray-900'
            }`}
          >
            {previewMode ? <><Edit3 className="w-3.5 h-3.5" /> Edit</> : <><Eye className="w-3.5 h-3.5" /> View</>}
          </Button>
        </div>
      </div>

      {/* ── How-to hint ─────────────────────────────────────────────── */}
      {!previewMode && !hasLyrics && (
        <div className="bg-blue-50 border-b border-blue-100 px-4 py-3 flex-shrink-0">
          <p className="text-blue-700 text-sm font-semibold mb-1">How to use:</p>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-blue-600">
            <span>① Click <strong>"Add lyrics"</strong> below → type your song</span>
            <span>② Click any <strong>word</strong> → pick a chord that appears above it</span>
            <span>③ Click <strong>"View"</strong> to see the final result</span>
          </div>
        </div>
      )}

      {!previewMode && hasLyrics && !hasChords && (
        <div className="bg-amber-50 border-b border-amber-100 px-4 py-2 flex-shrink-0">
          <p className="text-amber-700 text-xs">
            💡 <strong>Tap any word</strong> in your lyrics to add a chord above it
          </p>
        </div>
      )}

      {/* ── Settings panel ──────────────────────────────────────────── */}
      {showSettings && (
        <div className="bg-muted border-b border-border px-3 py-3 flex-shrink-0">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            <div>
              <label className="text-muted-foreground text-xs block mb-1">Title</label>
              <Input
                value={song.title}
                onChange={e => updateTitle(e.target.value)}
                className="h-8 text-sm focus-visible:ring-amber-400"
              />
            </div>
            <div>
              <label className="text-muted-foreground text-xs block mb-1">Artist</label>
              <Input
                value={song.artist || ''}
                onChange={e => updateArtist(e.target.value)}
                className="h-8 text-sm focus-visible:ring-amber-400"
              />
            </div>
            <div>
              <label className="text-muted-foreground text-xs block mb-1">Key</label>
              <select
                value={song.key || ''}
                onChange={e => updateKey(e.target.value)}
                className="w-full h-8 bg-background text-foreground rounded-md px-2 py-1 text-sm border border-input focus:outline-none focus:ring-1 focus:ring-amber-400"
              >
                <option value="">—</option>
                {allKeys.map(k => <option key={k} value={k}>{k}</option>)}
              </select>
            </div>
            <div>
              <label className="text-muted-foreground text-xs block mb-1">Capo</label>
              <Input
                type="number" min={0} max={12}
                value={song.capo ?? 0}
                onChange={e => updateCapo(Number(e.target.value))}
                className="h-8 text-sm focus-visible:ring-amber-400"
              />
            </div>
          </div>
          <div className="flex flex-wrap gap-3 mt-3 items-center">
            <div>
              <label className="text-muted-foreground text-xs block mb-1">Language</label>
              <select
                value={song.language}
                onChange={e => updateLanguage(e.target.value as Song['language'])}
                className="bg-background text-foreground rounded-md px-2 py-1 text-sm border border-input focus:outline-none focus:ring-1 focus:ring-amber-400"
              >
                <option value="en">English</option>
                <option value="he">Hebrew / עברית</option>
                <option value="mixed">Mixed</option>
              </select>
            </div>
            <div>
              <label className="text-muted-foreground text-xs block mb-1">Transpose</label>
              <div className="flex gap-1">
                <Button variant="outline" size="sm" onClick={() => transpose(-1)} className="h-8 px-2">−1</Button>
                <Button variant="outline" size="sm" onClick={() => transpose(1)} className="h-8 px-2">+1</Button>
              </div>
            </div>
            <div>
              <label className="text-gray-500 text-xs block mb-1">Export</label>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigator.clipboard.writeText(exportChordPro())}
                className="h-8 text-xs"
              >
                Copy ChordPro
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Preview controls ─────────────────────────────────────────── */}
      {previewMode && (
        <div className="bg-muted border-b border-border px-3 py-2 flex items-center gap-4 flex-shrink-0">
          <label className="flex items-center gap-1.5 text-muted-foreground text-sm cursor-pointer">
            <input type="checkbox" checked={showChords} onChange={e => setShowChords(e.target.checked)} className="accent-amber-500" />
            Show chords
          </label>
          <label className="flex items-center gap-1.5 text-muted-foreground text-sm cursor-pointer">
            <input type="checkbox" checked={autoScroll} onChange={e => setAutoScroll(e.target.checked)} className="accent-amber-500" />
            Auto-scroll
          </label>
          <div className="flex items-center gap-2 ml-auto">
            <span className="text-muted-foreground text-xs">A</span>
            <input
              type="range" min={14} max={28} value={fontSize}
              onChange={e => setFontSize(Number(e.target.value))}
              className="w-20 accent-amber-500"
            />
            <span className="text-foreground text-base font-semibold">A</span>
          </div>
        </div>
      )}

      {/* ── Main content ─────────────────────────────────────────────── */}
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
                    className="text-muted-foreground text-sm bg-transparent border-none focus:outline-none flex-1 focus:ring-0"
                    placeholder="Label..."
                  />
                  {song.sections.length > 1 && (
                    <button
                      onClick={() => removeSection(section.id)}
                      className="text-muted-foreground hover:text-red-400 text-xs px-1 touch-target"
                      title="Remove section"
                    >
                      ✕
                    </button>
                  )}
                </>
              ) : (
                <span className={`text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${SECTION_BADGE_COLORS[section.type]}`}>
                  {section.label || section.type}
                </span>
              )}
            </div>

            {/* Section content */}
            {!previewMode && editingSectionId === section.id ? (
              <textarea
                ref={editingSectionId === section.id ? textareaRef : undefined}
                value={editText}
                onChange={e => setEditText(e.target.value)}
                onBlur={() => finishEdit(section.id)}
                autoFocus
                dir={song.language === 'he' ? 'rtl' : 'auto'}
                rows={6}
                className="w-full bg-background text-foreground rounded-xl px-3 py-2.5 text-base border-2 border-amber-400 focus:outline-none resize-none min-h-[140px] leading-relaxed overflow-hidden"
                placeholder={song.language === 'he' ? 'הקלד מילות השיר כאן...' : 'Type your lyrics here, one line per line...'}
                style={{ height: 'auto' }}
              />
            ) : (
              <div className="rounded-xl">
                {section.lines.length === 0 && !previewMode ? (
                  <button
                    className="w-full border-2 border-dashed border-border hover:border-amber-400 rounded-xl py-5 text-center transition-colors group"
                    onClick={() => startEditSection(section)}
                  >
                    <div className="text-2xl mb-1">✍️</div>
                    <div className="text-amber-500 font-semibold text-sm group-hover:text-amber-600">
                      Add lyrics
                    </div>
                    <div className="text-muted-foreground text-xs mt-0.5">Click to type your song words</div>
                  </button>
                ) : (
                  <>
                    <div className={`px-1 ${!previewMode ? 'rounded-xl border border-transparent hover:border-border hover:bg-accent cursor-pointer' : ''}`}>
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
                    {!previewMode && (
                      <button
                        className="mt-2 flex items-center gap-1.5 px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground bg-muted hover:bg-accent rounded-lg transition-colors touch-target border border-border"
                        onClick={() => startEditSection(section)}
                      >
                        <Edit3 className="w-3 h-3" /> Edit lyrics
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
          <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-border">
            <span className="text-muted-foreground text-xs self-center mr-1">
              <Plus className="w-3 h-3 inline" /> Add section:
            </span>
            {(['verse', 'chorus', 'bridge', 'intro', 'outro'] as Section['type'][]).map(type => (
              <button
                key={type}
                onClick={() => addSection(type)}
                className={`px-3 py-1.5 text-xs rounded-lg capitalize touch-target border transition-colors ${SECTION_BADGE_COLORS[type]}`}
              >
                {type}
              </button>
            ))}
          </div>
        )}

        {previewMode && <div className="h-20" />}
      </div>

      {/* ── Floating "Edit" button in view mode ─────────────────────── */}
      {previewMode && (
        <div className="fixed bottom-6 right-6 z-30">
          <Button
            onClick={() => setPreviewMode(false)}
            className="gap-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-2xl shadow-2xl px-5"
          >
            <Edit3 className="w-4 h-4" /> Edit Song
          </Button>
        </div>
      )}

      {/* ── Chord Picker ─────────────────────────────────────────────── */}
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
