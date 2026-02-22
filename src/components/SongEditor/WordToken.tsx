
interface Props {
  text: string;
  chord?: string;
  isSpace?: boolean;
  isRTL?: boolean;
  onWordClick: () => void;
  onChordClick: () => void;
}

export default function WordToken({ text, chord, isSpace, isRTL, onWordClick, onChordClick }: Props) {
  if (isSpace) {
    return (
      <span className="inline-flex flex-col" aria-hidden="true">
        <span className="text-transparent text-sm leading-none select-none">·</span>
        <span style={{ whiteSpace: 'pre' }}>{text}</span>
      </span>
    );
  }

  return (
    <span
      className="word-token"
      style={{ marginRight: isRTL ? 0 : '2px', marginLeft: isRTL ? '2px' : 0 }}
    >
      {/* Chord above */}
      <span
        className="chord-text min-h-[1.2em]"
        onClick={chord ? onChordClick : onWordClick}
        aria-label={chord ? `Chord: ${chord}` : undefined}
        style={{ cursor: 'pointer' }}
      >
        {chord || ''}
      </span>
      {/* Word below */}
      <span
        className="token-word text-foreground"
        onClick={onWordClick}
        role="button"
        tabIndex={0}
        onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') onWordClick(); }}
        aria-label={`Word: ${text}${chord ? `, chord: ${chord}` : ''}`}
      >
        {text}
      </span>
    </span>
  );
}
