import { Play, Pause, Square, ChevronUp, ChevronDown, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { useUILanguage } from '@/context/UILanguageContext';
import {
  PlayerState, InstrumentType, INSTRUMENT_LABELS,
} from '@/hooks/useSongPlayer';

interface Props {
  playerState: PlayerState;
  bpm: number;
  instrument: InstrumentType;
  activeTokenId: string | null;
  currentChordLabel?: string;
  hasChords: boolean;
  isLoading?: boolean;
  onPlay: () => void;
  onPause: () => void;
  onStop: () => void;
  onResume: () => void;
  onBpmChange: (bpm: number) => void;
  onInstrumentChange: (instrument: InstrumentType) => void;
}

const INSTRUMENTS: InstrumentType[] = ['piano', 'guitar', 'organ', 'strings', 'synth'];
const BPM_MIN = 40;
const BPM_MAX = 200;
const BPM_STEP = 5;

export default function PlayerBar({
  playerState,
  bpm,
  instrument,
  currentChordLabel,
  hasChords,
  isLoading = false,
  onPlay,
  onPause,
  onStop,
  onResume,
  onBpmChange,
  onInstrumentChange,
}: Props) {
  const { t, uiLang } = useUILanguage();

  const isPlaying = playerState === 'playing';
  const isPaused = playerState === 'paused';
  const isActive = isPlaying || isPaused;

  function handlePlayPause() {
    if (isPlaying) return onPause();
    if (isPaused) return onResume();
    onPlay();
  }

  const instrumentLabel: Record<InstrumentType, string> = {
    piano: t.instrumentPiano,
    guitar: t.instrumentGuitar,
    organ: t.instrumentOrgan,
    strings: t.instrumentStrings,
    synth: t.instrumentSynth,
  };

  return (
    <div
      className="no-print fixed bottom-0 left-0 right-0 z-40 bg-card border-t border-border shadow-lg safe-bottom"
      dir={uiLang === 'he' ? 'rtl' : 'ltr'}
    >
      {!hasChords ? (
        /* No chords yet — soft hint */
        <div className="flex items-center justify-center gap-2 px-4 py-2.5 text-muted-foreground text-xs">
          <span className="text-base">🎵</span>
          <span>{t.playerNoChords}</span>
        </div>
      ) : (
        <div className="flex items-center gap-2 px-3 py-2 md:px-4 md:py-3">

          {/* Play / Pause button */}
          <Button
            size="icon"
            onClick={handlePlayPause}
            disabled={isLoading}
            className={`h-10 w-10 md:h-12 md:w-12 flex-shrink-0 rounded-full border-0 shadow-md ${
              isPlaying
                ? 'bg-amber-500 hover:bg-amber-600 text-gray-900'
                : 'bg-amber-400 hover:bg-amber-500 text-gray-900'
            }`}
            title={isLoading ? t.playerLoading : isPlaying ? t.playerPause : t.playerPlay}
          >
            {isLoading
              ? <Loader2 className="w-4 h-4 md:w-5 md:h-5 animate-spin" />
              : isPlaying
                ? <Pause className="w-4 h-4 md:w-5 md:h-5 fill-current" />
                : <Play className="w-4 h-4 md:w-5 md:h-5 fill-current" />
            }
          </Button>

          {/* Stop button — only visible when active */}
          {isActive && (
            <Button
              size="icon"
              variant="ghost"
              onClick={onStop}
              className="h-8 w-8 md:h-10 md:w-10 flex-shrink-0 text-muted-foreground hover:text-foreground"
              title={t.playerStop}
            >
              <Square className="w-3.5 h-3.5 md:w-4 md:h-4 fill-current" />
            </Button>
          )}

          {/* Current chord label */}
          <div className="flex-1 min-w-0 flex items-center">
            {isPlaying && currentChordLabel ? (
              <span className="text-amber-500 dark:text-amber-400 font-bold text-base md:text-lg truncate">
                {currentChordLabel}
              </span>
            ) : (
              <span className="text-muted-foreground text-xs truncate hidden sm:block">
                {t.playerPlay}
              </span>
            )}
          </div>

          {/* BPM control */}
          <div className="flex items-center gap-1 flex-shrink-0">
            <Button
              size="icon"
              variant="ghost"
              onClick={() => onBpmChange(Math.max(BPM_MIN, bpm - BPM_STEP))}
              className="h-7 w-7 md:h-8 md:w-8 text-muted-foreground hover:text-foreground"
              disabled={bpm <= BPM_MIN}
            >
              <ChevronDown className="w-3.5 h-3.5" />
            </Button>
            <span className="text-xs md:text-sm font-mono text-foreground w-8 md:w-10 text-center">
              {bpm}
            </span>
            <Button
              size="icon"
              variant="ghost"
              onClick={() => onBpmChange(Math.min(BPM_MAX, bpm + BPM_STEP))}
              className="h-7 w-7 md:h-8 md:w-8 text-muted-foreground hover:text-foreground"
              disabled={bpm >= BPM_MAX}
            >
              <ChevronUp className="w-3.5 h-3.5" />
            </Button>
            <span className="text-[10px] text-muted-foreground hidden sm:inline">{t.playerBpm}</span>
          </div>

          {/* Instrument selector */}
          <Select
            value={instrument}
            onValueChange={v => onInstrumentChange(v as InstrumentType)}
          >
            <SelectTrigger className="h-8 md:h-9 w-28 md:w-32 text-xs md:text-sm focus:ring-amber-400 flex-shrink-0">
              <SelectValue />
            </SelectTrigger>
            <SelectContent align="end">
              {INSTRUMENTS.map(inst => (
                <SelectItem key={inst} value={inst} className="text-sm">
                  {instrumentLabel[inst] ?? INSTRUMENT_LABELS[inst]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

        </div>
      )}
    </div>
  );
}
