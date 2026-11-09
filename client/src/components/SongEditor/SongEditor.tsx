import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { ArrowLeft, ArrowRight, Undo2, Redo2, Settings, Eye, Edit3, Plus, Share2, Check, X, SlidersHorizontal, GripVertical, CopyPlus, Clipboard, FileDown, Music2, Printer, Loader2 } from 'lucide-react';
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext, verticalListSortingStrategy, useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Song, Section } from '../../types';
import { useSong } from '../../hooks/useSong';
import { sectionToPlainText } from '../../utils/chordParser';
import { getAllKeys } from '../../utils/transpose';
import ChordLine from './ChordLine';
import ChordPicker from '../ChordPicker/ChordPicker';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip, TooltipContent, TooltipTrigger,
} from '@/components/ui/tooltip';
import { useUILanguage } from '@/context/UILanguageContext';
import type { T } from '@/context/UILanguageContext';
import api from '@/lib/api';

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
  currentChords: string[];
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

const SECTION_MENU_COLORS: Record<Section['type'], string> = {
  verse: 'text-blue-600',
  chorus: 'text-amber-600',
  bridge: 'text-purple-600',
  intro: 'text-green-600',
  outro: 'text-red-600',
  custom: 'text-gray-500',
};

const SECTION_TYPES: Section['type'][] = ['verse', 'chorus', 'bridge', 'intro', 'outro', 'custom'];

function SortableSection({ id, children }: { id: string; children: (dragHandle: React.ReactNode) => React.ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : undefined,
  };
  const dragHandle = (
    <button
      {...attributes}
      {...listeners}
      className="text-muted-foreground/40 hover:text-muted-foreground cursor-grab active:cursor-grabbing touch-none flex-shrink-0 p-1 -ml-1 rounded"
      tabIndex={-1}
    >
      <GripVertical className="w-4 h-4 md:w-5 md:h-5" />
    </button>
  );
  return (
    <div ref={setNodeRef} style={style}>
      {children(dragHandle)}
    </div>
  );
}

function sectionTypeLabel(type: Section['type'], t: T): string {
  const map: Record<Section['type'], string> = {
    verse: t.sectionVerse,
    chorus: t.sectionChorus,
    bridge: t.sectionBridge,
    intro: t.sectionIntro,
    outro: t.sectionOutro,
    custom: t.sectionCustom,
  };
  return map[type];
}

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
    duplicateSection,
    setLyrics,
    updateTitle,
    updateArtist,
    updateKey,
    updateCapo,
    updateLanguage,
    transpose,
    reorderSections,
    updateRecentChords,
  } = useSong(initialSong, onSave);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = song.sections.findIndex(s => s.id === active.id);
    const newIndex = song.sections.findIndex(s => s.id === over.id);
    reorderSections(oldIndex, newIndex);
  }

  const { t, uiLang } = useUILanguage();
  const [isEditingLyrics, setIsEditingLyrics] = useState(false);
  const [editTexts, setEditTexts] = useState<Record<string, string>>({});
  const [pickerTarget, setPickerTarget] = useState<PickerTarget>(null);
  const [previewMode, setPreviewMode] = useState(false);
  const [showChords, setShowChords] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [showPreviewControls, setShowPreviewControls] = useState(false);
  const [autoScroll, setAutoScroll] = useState(false);
  const [fontSize, setFontSize] = useState(18);
  const [shareCopied, setShareCopied] = useState(false);
  const [clipboardCopied, setClipboardCopied] = useState(false);
  const [showHowTo, setShowHowTo] = useState(() => localStorage.getItem('howto-dismissed') !== '1');
  const [recentChords, setRecentChords] = useState<string[]>(initialSong.recentChords || []);
  const [deleteSectionId, setDeleteSectionId] = useState<string | null>(null);
  const [pdfPreviewOpen, setPdfPreviewOpen] = useState(false);
  const [pdfFontSize, setPdfFontSize] = useState(18);
  const [safeBreakPositions, setSafeBreakPositions] = useState<number[]>([]);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const firstTextareaRef = useRef<HTMLTextAreaElement>(null);
  const pdfContentRef = useRef<HTMLDivElement>(null);
  const pdfInnerRef = useRef<HTMLDivElement>(null);

  const hasLyrics = song.sections.some(s => s.lines.some(l => l.tokens.some(t => !t.isSpace && t.text.trim())));
  const hasChords = song.sections.some(s => s.lines.some(l => l.tokens.some(t => t.chords?.length)));

  function dismissHowTo() {
    localStorage.setItem('howto-dismissed', '1');
    setShowHowTo(false);
  }

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

  useEffect(() => {
    if (isEditingLyrics) {
      firstTextareaRef.current?.focus();
    }
  }, [isEditingLyrics]);

  useEffect(() => {
    if (pdfPreviewOpen) {
      document.body.classList.add('pdf-preview-active');
    } else {
      document.body.classList.remove('pdf-preview-active');
    }
    return () => document.body.classList.remove('pdf-preview-active');
  }, [pdfPreviewOpen]);

  // Compute page-break positions snapped to element boundaries (never mid-word)
  useEffect(() => {
    if (!pdfPreviewOpen) return;
    const compute = () => {
      const el = pdfInnerRef.current;
      if (!el || !el.offsetWidth) return;

      // A4 ratio: 297mm / 210mm ≈ 1.4143
      const ph = Math.round(1.4143 * el.offsetWidth);

      if (el.scrollHeight <= ph) {
        setSafeBreakPositions([]);
        return;
      }

      // Only snap to whole lyric-row or section boundaries — never inner token/chord spans
      const candidates: number[] = [0];
      for (const child of Array.from(el.querySelectorAll('.chord-line-row, .mb-8')) as HTMLElement[]) {
        candidates.push(child.offsetTop + child.offsetHeight);
      }
      candidates.sort((a, b) => a - b);

      const numBreaks = Math.ceil(el.scrollHeight / ph) - 1;
      const breaks: number[] = [];
      for (let n = 1; n <= numBreaks; n++) {
        const target = ph * n;
        // Snap to the last element bottom edge that fits fully before the target
        let snap = target;
        for (const y of candidates) {
          if (y <= target) snap = y;
          else break;
        }
        breaks.push(snap);
      }

      setSafeBreakPositions(breaks);
    };

    requestAnimationFrame(compute);
    const ro = new ResizeObserver(compute);
    if (pdfInnerRef.current) ro.observe(pdfInnerRef.current);
    return () => ro.disconnect();
  }, [pdfPreviewOpen]);

  function buildSongText(): string {
    const lines: string[] = [`🎵 ${song.title}${song.artist ? ` — ${song.artist}` : ''}`, ''];
    for (const section of song.sections) {
      if (section.label) lines.push(`[ ${section.label} ]`);
      for (const line of section.lines) {
        const chordLine = line.tokens.map(t => { const c = t.chords?.join(' ') || ''; return c ? c.padEnd(Math.max(t.text.length, c.length + 1)) : ' '.repeat(Math.max(t.text.length, 1)); }).join('');
        const lyricLine = line.tokens.map(t => t.text).join('');
        if (chordLine.trim()) lines.push(chordLine);
        if (lyricLine.trim()) lines.push(lyricLine);
      }
      lines.push('');
    }
    return lines.join('\n');
  }

  const copyToClipboard = useCallback(() => {
    const lines: string[] = [`🎵 ${song.title}${song.artist ? ` — ${song.artist}` : ''}`, ''];
    for (const section of song.sections) {
      if (section.label) lines.push(`[ ${section.label} ]`);
      for (const line of section.lines) {
        const lyricLine = line.tokens.map(t => t.text).join('');
        if (lyricLine.trim()) lines.push(lyricLine);
      }
      lines.push('');
    }
    navigator.clipboard.writeText(lines.join('\n'));
    setClipboardCopied(true);
    setTimeout(() => setClipboardCopied(false), 2500);
  }, [song]);

  const handleExportPDF = useCallback(() => {
    setShowSettings(false);
    setPdfFontSize(fontSize);
    setPdfPreviewOpen(true);
  }, [fontSize]);

  const generatePDF = useCallback(async () => {
    const element = pdfInnerRef.current; // capture the white paper content, not the scroll container
    if (!element) return;
    setIsGeneratingPDF(true);
    try {
      await document.fonts.ready;
      const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
        import('html2canvas'),
        import('jspdf'),
      ]);

      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        width: element.scrollWidth,
        height: element.scrollHeight,
        windowWidth: element.scrollWidth,
        windowHeight: element.scrollHeight,
        scrollX: 0,
        scrollY: 0,
        onclone: (_doc, el) => {
          // Hide page-break guide lines from the captured image
          el.querySelectorAll('.pdf-page-guide').forEach(g => {
            (g as HTMLElement).style.display = 'none';
          });
        },
      });

      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pdfW = pdf.internal.pageSize.getWidth();
      // Scale=2 means each element pixel = 2 canvas pixels
      const canvasScale = 2;
      const safeBreaksCanvas = safeBreakPositions.map(y => Math.round(y * canvasScale));
      const allBreaks = [0, ...safeBreaksCanvas, canvas.height];
      const topMarginMm = 8; // breathing room at top of pages 2+

      for (let pageIdx = 0; pageIdx < allBreaks.length - 1; pageIdx++) {
        const srcY = allBreaks[pageIdx];
        const srcH = allBreaks[pageIdx + 1] - srcY;

        // Draw just this page's slice onto a temporary canvas
        const sliceCanvas = document.createElement('canvas');
        sliceCanvas.width = canvas.width;
        sliceCanvas.height = srcH;
        const ctx = sliceCanvas.getContext('2d')!;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, sliceCanvas.width, sliceCanvas.height);
        ctx.drawImage(canvas, 0, srcY, canvas.width, srcH, 0, 0, canvas.width, srcH);

        const sliceData = sliceCanvas.toDataURL('image/jpeg', 0.92);
        const sliceHeightMm = (srcH / canvas.width) * pdfW;
        const yOnPage = pageIdx === 0 ? 0 : topMarginMm;

        if (pageIdx > 0) pdf.addPage();
        pdf.addImage(sliceData, 'JPEG', 0, yOnPage, pdfW, sliceHeightMm);
      }

      const filename = `${(song.title || 'song').replace(/[^\w\s-]/g, '').trim() || 'song'}.pdf`;
      const blob = pdf.output('blob');
      const file = new File([blob], filename, { type: 'application/pdf' });

      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: song.title || 'Song' });
      } else {
        pdf.save(filename);
      }
    } catch (err) {
      console.error('PDF generation failed:', err);
    } finally {
      setIsGeneratingPDF(false);
    }
  }, [song.title, safeBreakPositions]);

  const shareSong = useCallback(async () => {
    const text = buildSongText();
    if (navigator.share) {
      try {
        await navigator.share({ title: song.title, text });
        return;
      } catch {
        // user cancelled or share failed — fall through to clipboard
      }
    }
    navigator.clipboard.writeText(text);
    setShareCopied(true);
    setTimeout(() => setShareCopied(false), 2500);
  }, [song]);

  function startEditAllSections() {
    const texts: Record<string, string> = {};
    song.sections.forEach(s => { texts[s.id] = sectionToPlainText(s.lines); });
    setEditTexts(texts);
    setIsEditingLyrics(true);
  }

  function finishSectionEdit(sectionId: string, text: string) {
    setLyrics(sectionId, text);
  }

  function finishAllEdits() {
    setIsEditingLyrics(false);
    setEditTexts({});
  }

  function handleTokenClick(sectionId: string, lineId: string, tokenId: string) {
    if (previewMode) return;
    const token = song.sections
      .find(s => s.id === sectionId)?.lines
      .find(l => l.id === lineId)?.tokens
      .find(t => t.id === tokenId);
    setPickerTarget({ sectionId, lineId, tokenId, currentChords: token?.chords || [] });
  }

  function handleChordSelect(chord: string) {
    if (!pickerTarget) return;
    addChordToToken(pickerTarget.sectionId, pickerTarget.lineId, pickerTarget.tokenId, chord);
    setPickerTarget(pt => pt ? { ...pt, currentChords: [...pt.currentChords, chord] } : null);
  }

  function handleRecentChordsChange(chords: string[]) {
    setRecentChords(chords);
    updateRecentChords(chords);
    api.patch(`/songs/${song.id}/recent-chords`, { chords }).catch(() => {});
  }

  function handleChordRemove(chord: string) {
    if (!pickerTarget) return;
    removeChordFromToken(pickerTarget.sectionId, pickerTarget.lineId, pickerTarget.tokenId, chord);
    setPickerTarget(pt => {
      if (!pt) return null;
      const arr = [...pt.currentChords];
      const idx = arr.indexOf(chord);
      if (idx !== -1) arr.splice(idx, 1);
      return { ...pt, currentChords: arr };
    });
  }


  const allKeys = getAllKeys();

  return (
    <div className="flex flex-col flex-1 min-h-0 bg-background">

      {/* Backdrop — closes lyrics edit on tap-outside */}
      {isEditingLyrics && (
        <div
          className="fixed inset-0 z-10"
          onClick={finishAllEdits}
        />
      )}

      {/* ═══════════════════════════════════════════════════════════════
          EDIT MODE TOOLBAR
      ════════════════════════════════════════════════════════════════ */}
      {!previewMode && (
        <div className="bg-card border-b border-border flex-shrink-0 shadow-sm">
          {/* Row 1: back + title */}
          <div className="flex items-center gap-2 px-3 pt-2.5 pb-1 md:pt-3 md:pb-1.5 lg:pt-4 lg:pb-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={onBack}
              className="gap-1 text-muted-foreground h-8 md:h-10 lg:h-12 px-2 lg:px-3 flex-shrink-0 -ml-1"
            >
              {uiLang === 'he' ? <ArrowRight className="w-4 h-4 md:w-5 md:h-5 lg:w-7 lg:h-7" /> : <ArrowLeft className="w-4 h-4 md:w-5 md:h-5 lg:w-7 lg:h-7" />}
              <span className="hidden sm:inline text-xs md:text-sm lg:text-xl">{t.library}</span>
            </Button>
            <div className="flex-1 min-w-0">
              <div className="text-foreground font-semibold text-sm md:text-xl lg:text-3xl leading-snug break-words line-clamp-2">
                {song.title || t.untitled}
              </div>
              {song.artist && (
                <div className="text-muted-foreground text-xs md:text-sm lg:text-lg truncate">{song.artist}</div>
              )}
            </div>
            {savedIndicator && (
              <span className="text-green-600 text-xs md:text-sm lg:text-lg font-medium flex-shrink-0">✓</span>
            )}
          </div>
          {/* Row 2: actions */}
          <div className="flex items-center gap-0.5 px-2 pb-2 md:pb-3 lg:pb-4 lg:gap-1">
            <Button
              variant="ghost" size="icon" onClick={undo} disabled={!canUndo}
              title="Undo" className="text-muted-foreground h-8 w-8 md:h-10 md:w-10 lg:h-12 lg:w-12"
            >
              <Undo2 className="w-4 h-4 md:w-5 md:h-5 lg:w-7 lg:h-7" />
            </Button>
            <Button
              variant="ghost" size="icon" onClick={redo} disabled={!canRedo}
              title="Redo" className="text-muted-foreground h-8 w-8 md:h-10 md:w-10 lg:h-12 lg:w-12"
            >
              <Redo2 className="w-4 h-4 md:w-5 md:h-5 lg:w-7 lg:h-7" />
            </Button>
            <Button
              variant="ghost" size="icon"
              onClick={() => setShowSettings(s => !s)}
              className={`h-8 w-8 md:h-10 md:w-10 lg:h-12 lg:w-12 ${showSettings ? 'text-amber-500 bg-amber-50 dark:bg-amber-900/20' : 'text-muted-foreground'}`}
              title={t.songSettings}
            >
              <Settings className="w-4 h-4 md:w-5 md:h-5 lg:w-7 lg:h-7" />
            </Button>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost" size="icon" onClick={copyToClipboard}
                  className="text-muted-foreground h-8 w-8 md:h-10 md:w-10 lg:h-12 lg:w-12"
                >
                  {clipboardCopied
                    ? <Check className="w-4 h-4 md:w-5 md:h-5 lg:w-7 lg:h-7 text-green-500" />
                    : <Clipboard className="w-4 h-4 md:w-5 md:h-5 lg:w-7 lg:h-7" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">{t.copyToClipboard}</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost" size="icon" onClick={shareSong}
                  className="text-muted-foreground h-8 w-8 md:h-10 md:w-10 lg:h-12 lg:w-12"
                >
                  {shareCopied
                    ? <Check className="w-4 h-4 md:w-5 md:h-5 lg:w-7 lg:h-7 text-green-500" />
                    : <Share2 className="w-4 h-4 md:w-5 md:h-5 lg:w-7 lg:h-7" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">{t.shareSong}</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost" size="icon" onClick={handleExportPDF}
                  className="text-muted-foreground h-8 w-8 md:h-10 md:w-10 lg:h-12 lg:w-12"
                >
                  <FileDown className="w-4 h-4 md:w-5 md:h-5 lg:w-7 lg:h-7" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">{t.exportPdf}</TooltipContent>
            </Tooltip>
            <div className="flex-1" />
            <Button
              onClick={() => setPreviewMode(true)}
              className="gap-1.5 font-semibold border-0 bg-amber-400 hover:bg-amber-500 text-gray-900 h-8 md:h-10 lg:h-12 px-3 md:px-5 lg:px-7 text-sm md:text-base lg:text-xl"
            >
              <Eye className="w-3.5 h-3.5 md:w-4 md:h-4 lg:w-6 lg:h-6" /> {t.view}
            </Button>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════
          VIEW MODE TOOLBAR — clean, minimal
      ════════════════════════════════════════════════════════════════ */}
      {previewMode && (
        <div className="no-print bg-card border-b border-border flex-shrink-0 shadow-sm">
          <div className="flex items-center gap-2 px-3 h-12 md:h-16 lg:h-20">
            <Button
              variant="ghost" size="sm"
              onClick={() => setPreviewMode(false)}
              className="gap-1 text-muted-foreground h-8 md:h-10 lg:h-12 px-2 lg:px-4 -ml-1 flex-shrink-0"
            >
              {uiLang === 'he' ? <ArrowRight className="w-4 h-4 md:w-5 md:h-5 lg:w-7 lg:h-7" /> : <ArrowLeft className="w-4 h-4 md:w-5 md:h-5 lg:w-7 lg:h-7" />}
              <span className="text-xs md:text-base lg:text-xl">{t.editMode}</span>
            </Button>
            <div className="flex-1 min-w-0 text-center">
              <div className="text-foreground font-semibold text-sm md:text-xl lg:text-3xl truncate">
                {song.title || t.untitled}
              </div>
              {song.artist && (
                <div className="text-muted-foreground text-xs md:text-sm lg:text-lg truncate">{song.artist}</div>
              )}
            </div>
            <Button
              variant="ghost" size="icon"
              onClick={() => setShowPreviewControls(s => !s)}
              className={`h-8 w-8 md:h-10 md:w-10 lg:h-12 lg:w-12 flex-shrink-0 ${showPreviewControls ? 'text-amber-500 bg-amber-50 dark:bg-amber-900/20' : 'text-muted-foreground'}`}
              title={t.displayOptions}
            >
              <SlidersHorizontal className="w-4 h-4 md:w-5 md:h-5 lg:w-7 lg:h-7" />
            </Button>
          </div>

          {/* Collapsible controls */}
          {showPreviewControls && (
            <div className="border-t border-border px-3 py-2.5 bg-muted flex items-center gap-4 flex-wrap">
              <label className="flex items-center gap-1.5 text-muted-foreground text-sm cursor-pointer">
                <Checkbox
                  checked={showChords}
                  onCheckedChange={v => setShowChords(!!v)}
                  className="border-amber-400 data-[state=checked]:bg-amber-400"
                />
                {t.chordsLabel}
              </label>
              <label className="flex items-center gap-1.5 text-muted-foreground text-sm cursor-pointer">
                <Checkbox
                  checked={autoScroll}
                  onCheckedChange={v => setAutoScroll(!!v)}
                  className="border-amber-400 data-[state=checked]:bg-amber-400"
                />
                {t.autoScroll}
              </label>
              <div className="flex items-center gap-2 ml-auto">
                <span className="text-muted-foreground text-xs">A</span>
                <Slider
                  min={14} max={28} step={1}
                  value={[fontSize]}
                  onValueChange={([v]) => setFontSize(v)}
                  className="w-20"
                />
                <span className="text-foreground text-base font-semibold">A</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── How-to hint (dismissible, edit mode only) ────────────────── */}
      {!previewMode && !hasLyrics && showHowTo && (
        <div className="bg-blue-50 border-b border-blue-100 px-4 py-3 flex-shrink-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-blue-700 text-sm font-semibold mb-1">{t.howToTitle}</p>
              <div className="flex flex-col gap-0.5 text-xs text-blue-600">
                <span>{t.howTo1}</span>
                <span>{t.howTo2}</span>
                <span>{t.howTo3}</span>
              </div>
            </div>
            <Button
              variant="ghost" size="icon" onClick={dismissHowTo}
              className="h-6 w-6 text-blue-400 hover:text-blue-600 flex-shrink-0 -mt-0.5 -mr-1"
            >
              <X className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      )}

      {!previewMode && hasLyrics && !hasChords && (
        <div className="bg-amber-50 border-b border-amber-100 px-4 py-2 flex-shrink-0">
          <p className="text-amber-700 text-xs">
            💡 {t.chordTip}
          </p>
        </div>
      )}

      {/* ── Settings panel (edit mode only) ─────────────────────────── */}
      {!previewMode && showSettings && (
        <div className="bg-muted border-b border-border px-3 py-3 flex-shrink-0">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            <div>
              <label className="text-muted-foreground text-xs block mb-1">{t.titleLabel}</label>
              <Input
                value={song.title}
                onChange={e => updateTitle(e.target.value)}
                className="h-8 text-sm focus-visible:ring-amber-400"
              />
            </div>
            <div>
              <label className="text-muted-foreground text-xs block mb-1">{t.artistLabel}</label>
              <Input
                value={song.artist || ''}
                onChange={e => updateArtist(e.target.value)}
                className="h-8 text-sm focus-visible:ring-amber-400"
              />
            </div>
            <div>
              <label className="text-muted-foreground text-xs block mb-1">{t.keyLabel}</label>
              <Select value={song.key || 'none'} onValueChange={v => updateKey(v === 'none' ? '' : v)}>
                <SelectTrigger className="h-8 text-sm focus:ring-amber-400">
                  <SelectValue placeholder="—" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">—</SelectItem>
                  {allKeys.map(k => <SelectItem key={k} value={k}>{k}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-muted-foreground text-xs block mb-1">{t.capoLabel}</label>
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
              <label className="text-muted-foreground text-xs block mb-1">{t.songLanguage}</label>
              <Select value={song.language} onValueChange={v => updateLanguage(v as Song['language'])}>
                <SelectTrigger className="text-sm focus:ring-amber-400">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">{t.langEnglish}</SelectItem>
                  <SelectItem value="he">{t.langHebrew}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-muted-foreground text-xs block mb-1">{t.transposeLabel}</label>
              <div className="flex gap-1">
                <Button variant="outline" size="sm" onClick={() => transpose(-1)} className="h-8 px-2">−1</Button>
                <Button variant="outline" size="sm" onClick={() => transpose(1)} className="h-8 px-2">+1</Button>
              </div>
            </div>
            <div>
              <label className="text-gray-500 text-xs block mb-1">{t.exportLabel}</label>
              <Button
                variant="outline" size="sm"
                onClick={handleExportPDF}
                className="h-8 text-xs gap-1"
              >
                <FileDown className="w-3 h-3" />
                {t.exportPdf}
              </Button>
            </div>
            {song.createdAt && (
              <div>
                <label className="text-gray-500 text-xs block mb-1">{t.createdLabel}</label>
                <span className="text-muted-foreground text-xs">
                  {new Date(song.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Main content ─────────────────────────────────────────────── */}
      <div
        className="flex-1 overflow-y-auto song-print-area"
        style={previewMode ? {
          '--song-font-size': `${fontSize}px`,
          '--song-chord-font-size': `${Math.round(fontSize * 0.65)}px`,
        } as React.CSSProperties : undefined}
      >
        {/* Print-only header */}
        <div className="print-only px-4 pt-6 pb-3 border-b border-border flex items-start justify-between gap-4" dir={uiLang === 'he' ? 'rtl' : 'ltr'}>
          <div className={uiLang === 'he' ? 'text-right' : 'text-left'}>
            <h1 className="font-bold text-2xl font-song">{song.title || t.untitled}</h1>
            {song.artist && <p className="text-muted-foreground text-base mt-0.5">{song.artist}</p>}
            {song.key && <p className="text-sm text-muted-foreground mt-1">{t.keyLabel}: {song.key}{song.capo ? ` · Capo ${song.capo}` : ''}</p>}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <div className="w-10 h-10 bg-amber-400 rounded-xl flex items-center justify-center">
              <Music2 className="w-6 h-6 text-gray-900" />
            </div>
            <span className="font-bold text-xl tracking-tight">{t.appName}</span>
          </div>
        </div>
        <div className="min-h-full flex flex-col">
          <div className="flex-1 px-4 py-4 pb-20">
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={song.sections.map(s => s.id)} strategy={verticalListSortingStrategy}>
            {song.sections.map(section => (
              <SortableSection key={section.id} id={section.id}>
                {dragHandle => (
              <div className="mb-8">
                {/* Section header */}
                <div className="flex items-center gap-2 mb-2 md:mb-3 lg:mb-4">
                  {!previewMode ? (
                    <>
                      {dragHandle}
                      <Select value={section.type} onValueChange={v => updateSectionType(section.id, v as Section['type'])}>
                        <SelectTrigger className={`h-auto py-0 px-1 w-auto border-none bg-transparent shadow-none text-xs md:text-base lg:text-2xl font-bold uppercase focus:ring-0 ${SECTION_TYPE_COLORS[section.type]}`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {SECTION_TYPES.map(type => <SelectItem key={type} value={type}>{sectionTypeLabel(type, t)}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <Input
                        value={section.label || ''}
                        onChange={e => updateSectionLabel(section.id, e.target.value)}
                        className="text-muted-foreground text-sm md:text-base lg:text-2xl bg-transparent border-none shadow-none focus-visible:ring-0 flex-1 h-auto px-1 py-0"
                        placeholder={t.labelPlaceholder}
                      />
                      <Button
                        variant="ghost" size="sm"
                        onClick={() => duplicateSection(section.id)}
                        className="text-muted-foreground hover:text-amber-500 text-xs md:text-sm lg:text-base px-1 md:px-2 lg:px-3 h-auto"
                        title={t.duplicateSection}
                      >
                        <CopyPlus className="w-3.5 h-3.5 md:w-4 md:h-4" />
                      </Button>
                      {song.sections.length > 1 && (
                        <Button
                          variant="ghost" size="sm"
                          onClick={() => setDeleteSectionId(section.id)}
                          className="text-muted-foreground hover:text-red-400 text-xs md:text-sm lg:text-base px-1 md:px-2 lg:px-3 h-auto"
                          title={t.removeSectionTitle}
                        >
                          ✕
                        </Button>
                      )}
                    </>
                  ) : (
                    <span className={`text-xs md:text-sm lg:text-xl font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${SECTION_BADGE_COLORS[section.type]}`}>
                      {section.label || sectionTypeLabel(section.type, t)}
                    </span>
                  )}
                </div>

                {/* Section content */}
                {!previewMode && isEditingLyrics ? (
                  <div className="relative z-20">
                    <Textarea
                      ref={song.sections[0]?.id === section.id ? firstTextareaRef : undefined}
                      value={editTexts[section.id] ?? ''}
                      onChange={e => {
                        const val = e.target.value;
                        setEditTexts(prev => ({ ...prev, [section.id]: val }));
                        const el = e.target;
                        el.style.height = 'auto';
                        el.style.height = `${el.scrollHeight}px`;
                      }}
                      onBlur={e => finishSectionEdit(section.id, e.target.value)}
                      dir={song.language === 'he' ? 'rtl' : 'auto'}
                      rows={6}
                      className="w-full rounded-xl px-3 py-2.5 text-base md:text-xl border-2 border-amber-400 focus-visible:ring-0 focus-visible:ring-offset-0 resize-none min-h-[140px] md:min-h-[200px] leading-relaxed overflow-hidden font-song"
                      placeholder={song.language === 'he' ? 'הקלד מילות השיר כאן...' : 'Type your lyrics here, one line per line...'}
                      style={{ height: 'auto' }}
                    />
                  </div>
                ) : (
                  <div className="rounded-xl">
                    {section.lines.length === 0 && !previewMode ? (
                      <Button
                        variant="outline"
                        onClick={() => startEditAllSections()}
                        className="w-full border-2 border-dashed border-border hover:border-amber-400 rounded-xl py-5 h-auto flex-col gap-1 transition-colors group"
                      >
                        <div className="text-2xl md:text-4xl">✍️</div>
                        <div className="text-amber-500 font-semibold text-sm md:text-base group-hover:text-amber-600">{t.addLyricsBtn}</div>
                        <div className="text-muted-foreground text-xs md:text-sm">{t.tapToType}</div>
                      </Button>
                    ) : (
                      <>
                        <div
                          className={`px-1 ${!previewMode ? 'rounded-xl border border-transparent section-lyrics-area' : ''}`}
                        >
                          {section.lines.map(line => (
                            <ChordLine
                              key={line.id}
                              line={line}
                              sectionId={section.id}
                              onTokenClick={handleTokenClick}
                              showChords={showChords}
                              readOnly={previewMode}
                            />
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
                )}
              </SortableSection>
            ))}
              </SortableContext>
            </DndContext>
          </div>
        </div>
      </div>

      {/* ── Fixed bottom action bar (edit mode only) ────────────────── */}
      {!previewMode && (
        <div className={`fixed bottom-5 z-30 flex items-center gap-2 ${uiLang === 'he' ? 'right-4' : 'left-4'}`}>

          {/* Edit lyrics */}
          <Button
            variant="outline"
            onClick={startEditAllSections}
            className="gap-1.5 bg-card shadow-md border-border hover:border-amber-400 hover:text-amber-600 text-muted-foreground h-9 md:h-11 lg:h-14 px-3 md:px-4 lg:px-6 text-sm md:text-base lg:text-xl"
          >
            <Edit3 className="w-3.5 h-3.5 md:w-4 md:h-4 lg:w-6 lg:h-6" />
            {t.editLyrics}
          </Button>

          {/* Add section */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                className="gap-1.5 bg-card shadow-md border-border hover:border-amber-400 hover:text-amber-600 text-muted-foreground h-9 md:h-11 lg:h-14 px-3 md:px-4 lg:px-6 text-sm md:text-base lg:text-xl"
              >
                <Plus className="w-3.5 h-3.5 md:w-4 md:h-4 lg:w-6 lg:h-6" />
                {t.addSection}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" side="top" className="w-40 md:w-52">
              {SECTION_TYPES.map(type => (
                <DropdownMenuItem
                  key={type}
                  onClick={() => addSection(type)}
                  className={`capitalize font-medium md:text-base md:py-2 lg:text-xl lg:py-3 ${SECTION_MENU_COLORS[type]}`}
                >
                  {sectionTypeLabel(type, t)}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

        </div>
      )}

      {/* ── Delete section confirmation ──────────────────────────────── */}
      <Dialog open={deleteSectionId !== null} onOpenChange={open => { if (!open) setDeleteSectionId(null); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{t.deleteSectionTitle}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {(() => {
              const sec = song.sections.find(s => s.id === deleteSectionId);
              return sec
                ? `"${sec.label || sectionTypeLabel(sec.type, t)}" ${t.deleteSectionDesc}`
                : t.deleteSectionFallback;
            })()}
          </p>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteSectionId(null)}>
              {t.cancel}
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (deleteSectionId) removeSection(deleteSectionId);
                setDeleteSectionId(null);
              }}
            >
              {t.delete}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Chord Picker ─────────────────────────────────────────────── */}
      <ChordPicker
        isOpen={pickerTarget !== null}
        onClose={() => setPickerTarget(null)}
        onSelect={handleChordSelect}
        onRemoveChord={handleChordRemove}
        currentChords={pickerTarget?.currentChords || []}
        isMobile={isMobile}
        recentlyUsed={recentChords}
        onRecentChordsChange={handleRecentChordsChange}
      />

      {/* ── PDF Preview Portal ────────────────────────────────────────── */}
      {pdfPreviewOpen && createPortal(
        <div
          className="pdf-preview-portal"
          style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', flexDirection: 'column', backgroundColor: '#1e293b' }}
        >
          {/* Controls toolbar — dark, PDF-viewer style */}
          <div
            className="pdf-preview-controls"
            style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 16px', backgroundColor: '#0f172a', flexShrink: 0 }}
          >
            <Button
              variant="ghost" size="icon"
              onClick={() => setPdfPreviewOpen(false)}
              className="h-9 w-9 text-slate-400 hover:text-white flex-shrink-0"
              title={t.cancel}
            >
              <X className="w-4 h-4" />
            </Button>
            <span className="text-slate-200 text-sm font-medium truncate flex-1 min-w-0">
              {song.title || t.untitled}
            </span>
            <div className="flex items-center gap-2 flex-shrink-0">
              <span className="text-slate-400 text-xs select-none">A</span>
              <Slider
                min={10} max={32} step={1}
                value={[pdfFontSize]}
                onValueChange={([v]) => setPdfFontSize(v)}
                className="w-24"
              />
              <span className="text-slate-200 text-base font-semibold select-none">A</span>
            </div>
            <Button
              onClick={generatePDF}
              disabled={isGeneratingPDF}
              className="gap-1.5 bg-amber-400 hover:bg-amber-500 text-gray-900 font-bold border-0 h-9 px-4 text-sm flex-shrink-0 disabled:opacity-70"
            >
              {isGeneratingPDF
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : <Printer className="w-4 h-4" />}
              {isGeneratingPDF ? '...' : t.exportPdf}
            </Button>
          </div>

          {/* Scrollable viewer area — gray bg simulates PDF viewer */}
          <div
            ref={pdfContentRef}
            className="pdf-preview-content flex-1 overflow-y-auto"
            style={{ padding: '24px 16px', backgroundColor: '#334155' }}
          >
            {/* White A4 paper — this is the element captured for PDF */}
            <div
              ref={pdfInnerRef}
              style={{
                position: 'relative',
                maxWidth: '794px',
                margin: '0 auto',
                backgroundColor: '#ffffff',
                boxShadow: '0 4px 24px rgba(0,0,0,0.4)',
                padding: '48px 56px',
                '--song-font-size': `${pdfFontSize}px`,
                '--song-chord-font-size': `${Math.round(pdfFontSize * 0.65)}px`,
              } as React.CSSProperties}
            >
              {/* Page-break guide strips — snapped to element edges, hidden in PDF capture */}
              {safeBreakPositions.map((yPos, i) => (
                <div
                  key={i}
                  className="pdf-page-guide"
                  style={{
                    position: 'absolute',
                    left: 0, right: 0,
                    top: `${yPos}px`,
                    height: '22px',
                    backgroundColor: 'rgba(100,116,139,0.15)',
                    borderTop: '1px solid rgba(100,116,139,0.4)',
                    borderBottom: '1px solid rgba(100,116,139,0.4)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '10px',
                    color: '#64748b',
                    letterSpacing: '0.08em',
                    fontFamily: 'system-ui, sans-serif',
                    pointerEvents: 'none',
                    zIndex: 5,
                  }}
                >
                  — Page {i + 2} —
                </div>
              ))}

              {/* Song header */}
              <div
                style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px', paddingBottom: '16px', marginBottom: '24px', borderBottom: '1px solid #e2e8f0' }}
                dir={uiLang === 'he' ? 'rtl' : 'ltr'}
              >
                <div style={{ textAlign: uiLang === 'he' ? 'right' : 'left' }}>
                  <div style={{ fontWeight: 700, fontSize: '1.5rem', lineHeight: 1.2 }}>{song.title || t.untitled}</div>
                  {song.artist && <div style={{ color: '#64748b', fontSize: '1rem', marginTop: '4px' }}>{song.artist}</div>}
                  {song.key && <div style={{ color: '#94a3b8', fontSize: '0.85rem', marginTop: '4px' }}>{t.keyLabel}: {song.key}{song.capo ? ` · Capo ${song.capo}` : ''}</div>}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                  <div style={{ width: '36px', height: '36px', backgroundColor: '#fbbf24', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Music2 style={{ width: '20px', height: '20px', color: '#111827' }} />
                  </div>
                  <span style={{ fontWeight: 700, fontSize: '1rem' }}>{t.appName}</span>
                </div>
              </div>

              {/* Sections */}
              <div>
                {song.sections.map(section => (
                  <div key={section.id} className="mb-8">
                    <div style={{ marginBottom: '8px' }}>
                      <span className={`text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${SECTION_BADGE_COLORS[section.type]}`}>
                        {section.label || sectionTypeLabel(section.type, t)}
                      </span>
                    </div>
                    <div>
                      {section.lines.map(line => (
                        <ChordLine
                          key={line.id}
                          line={line}
                          sectionId={section.id}
                          onTokenClick={() => {}}
                          showChords={true}
                          readOnly={true}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
