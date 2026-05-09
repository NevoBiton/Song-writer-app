import { useRef } from 'react';

interface Props {
  text: string;
  chords?: string[];
  isSpace?: boolean;
  isRTL?: boolean;
  readOnly?: boolean;
  onWordClick: () => void;
  onChordClick: () => void;
}

export default function WordToken({ text, chords, isSpace, isRTL, readOnly, onWordClick, onChordClick }: Props) {
  const touchScrolled = useRef(false);
  const touchStartY = useRef(0);

  if (isSpace) {
    return (
      <span className="inline-flex flex-col" aria-hidden="true">
        <span className="text-transparent text-sm leading-none select-none">·</span>
        <span style={{ whiteSpace: 'pre' }}>{text}</span>
      </span>
    );
  }

  const hasChords = chords && chords.length > 0;
  const displayChords = hasChords ? (isRTL ? [...chords].reverse() : chords) : [];

  function handleTouchStart(e: React.TouchEvent) {
    touchScrolled.current = false;
    touchStartY.current = e.touches[0].clientY;
  }

  function handleTouchMove(e: React.TouchEvent) {
    if (Math.abs(e.touches[0].clientY - touchStartY.current) > 8) {
      touchScrolled.current = true;
    }
  }

  return (
    <span
      className={`word-token${readOnly ? ' is-readonly' : ''}`}
      style={{ marginRight: isRTL ? 0 : '2px', marginLeft: isRTL ? '2px' : 0 }}
      onTouchStart={!readOnly ? handleTouchStart : undefined}
      onTouchMove={!readOnly ? handleTouchMove : undefined}
    >
      {/* Chords above */}
      <span
        className="chord-text min-h-[1.2em] flex items-center gap-0.5"
        onClick={!readOnly ? () => { if (!touchScrolled.current) (hasChords ? onChordClick : onWordClick)(); } : undefined}
        style={{ cursor: readOnly ? 'default' : 'pointer' }}
        aria-label={hasChords ? `Chords: ${chords!.join(', ')}` : undefined}
      >
        {hasChords
          ? displayChords.map((c, i) => (
              <span key={i} className="inline-flex items-center">
                {i > 0 && <span className="text-amber-300 mx-0.5 text-[0.6em]">·</span>}
                {c}
              </span>
            ))
          : ''}
      </span>
      {/* Word below */}
      <span
        className="token-word text-foreground"
        onClick={!readOnly ? () => { if (!touchScrolled.current) onWordClick(); } : undefined}
        role={!readOnly ? 'button' : undefined}
        tabIndex={!readOnly ? 0 : undefined}
        onKeyDown={!readOnly ? (e => { if (e.key === 'Enter' || e.key === ' ') onWordClick(); }) : undefined}
        aria-label={`Word: ${text}${hasChords ? `, chords: ${chords.join(', ')}` : ''}`}
      >
        {text}
      </span>
    </span>
  );
}
