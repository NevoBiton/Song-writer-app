import { Line } from '../../types';
import { isRTLLine } from '../../utils/rtlUtils';
import WordToken from './WordToken';

interface Props {
  line: Line;
  sectionId: string;
  onTokenClick: (sectionId: string, lineId: string, tokenId: string, currentChord?: string) => void;
  showChords?: boolean;
}

export default function ChordLine({ line, sectionId, onTokenClick, showChords = true }: Props) {
  const lineText = line.tokens.map(t => t.text).join('');
  const rtl = isRTLLine(lineText);

  return (
    <div
      dir={rtl ? 'rtl' : 'ltr'}
      className="flex flex-wrap items-end leading-loose py-1"
      style={{ fontFamily: 'inherit' }}
    >
      {line.tokens.map(token => (
        <WordToken
          key={token.id}
          text={token.text}
          chord={showChords ? token.chord : undefined}
          isSpace={token.isSpace}
          isRTL={rtl}
          onWordClick={() => onTokenClick(sectionId, line.id, token.id, undefined)}
          onChordClick={() => onTokenClick(sectionId, line.id, token.id, token.chord)}
        />
      ))}
    </div>
  );
}
