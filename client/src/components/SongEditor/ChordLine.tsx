import { Line } from '../../types';
import { isRTLLine } from '../../utils/rtlUtils';
import WordToken from './WordToken';

interface Props {
  line: Line;
  sectionId: string;
  onTokenClick: (sectionId: string, lineId: string, tokenId: string) => void;
  showChords?: boolean;
  readOnly?: boolean;
  activeTokenId?: string | null;
}

export default function ChordLine({ line, sectionId, onTokenClick, showChords = true, readOnly, activeTokenId }: Props) {
  const lineText = line.tokens.map(t => t.text).join('');
  const rtl = isRTLLine(lineText);

  return (
    <div
      dir={rtl ? 'rtl' : 'ltr'}
      className="chord-line-row flex flex-wrap items-end leading-loose py-1 font-song"
    >
      {line.tokens.map(token => (
        <WordToken
          key={token.id}
          text={token.text}
          chords={showChords ? token.chords : undefined}
          isSpace={token.isSpace}
          isRTL={rtl}
          readOnly={readOnly}
          isActive={activeTokenId != null && token.id === activeTokenId}
          onWordClick={() => onTokenClick(sectionId, line.id, token.id)}
          onChordClick={() => onTokenClick(sectionId, line.id, token.id)}
        />
      ))}
    </div>
  );
}
