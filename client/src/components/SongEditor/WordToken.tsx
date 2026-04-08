
interface Props {
  text: string;
  chords?: string[];
  isSpace?: boolean;
  isRTL?: boolean;
  onWordClick: () => void;
  onChordClick: () => void;
}

export default function WordToken({ text, chords, isSpace, isRTL, onWordClick, onChordClick }: Props) {
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

  return (
    <span
      className="word-token"
      style={{ marginRight: isRTL ? 0 : '2px', marginLeft: isRTL ? '2px' : 0 }}
    >
      {/* Chords above */}
      <span
        className="chord-text min-h-[1.2em] flex items-center gap-0.5"
        onClick={hasChords ? onChordClick : onWordClick}
        style={{ cursor: 'pointer' }}
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
        onClick={onWordClick}
        role="button"
        tabIndex={0}
        onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') onWordClick(); }}
        aria-label={`Word: ${text}${hasChords ? `, chords: ${chords.join(', ')}` : ''}`}
      >
        {text}
      </span>
    </span>
  );
}
