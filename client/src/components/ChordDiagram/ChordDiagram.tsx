import { getChord } from '../../data/chords';

interface Props {
  chordName: string;
  size?: 'sm' | 'md' | 'lg';
}

const SIZE = {
  sm: { width: 80,  height: 96,  fretW: 10, fretH: 12, dotR: 4,  fontSize: 8  },
  md: { width: 120, height: 140, fretW: 16, fretH: 18, dotR: 6,  fontSize: 11 },
  lg: { width: 160, height: 190, fretW: 20, fretH: 22, dotR: 8,  fontSize: 14 },
};

export default function ChordDiagram({ chordName, size = 'md' }: Props) {
  const chord = getChord(chordName);
  const s = SIZE[size];

  const strings = 6;
  const frets = 5;
  const paddingLeft = s.fretW * 1.5;
  const paddingTop = s.fretH * 1.8;
  const gridW = s.fretW * (strings - 1);
  const gridH = s.fretH * frets;

  if (!chord) {
    return (
      <div
        className="flex items-center justify-center text-gray-400 text-xs rounded bg-gray-800"
        style={{ width: s.width, height: s.height }}
      >
        {chordName}
      </div>
    );
  }

  // fingers[0] = high e, fingers[5] = low E
  const fingers = chord.fingers; // [e, B, G, D, A, E]
  const baseFret = chord.baseFret;
  const barres = chord.barres || [];

  const dotPositions = fingers.map((fret, stringIdx) => {
    if (fret <= 0) return null;
    const col = (strings - 1 - stringIdx) * s.fretW + paddingLeft;
    const row = (fret - baseFret + 0.5) * s.fretH + paddingTop;
    return { col, row };
  });

  const svgW = paddingLeft * 2 + gridW;
  const svgH = paddingTop + gridH + s.fretH;

  return (
    <div className="flex flex-col items-center gap-1">
      <svg width={svgW} height={svgH} aria-label={`Chord diagram for ${chordName}`}>
        {/* Nut or base fret indicator */}
        {baseFret === 1 ? (
          <rect x={paddingLeft} y={paddingTop - 3} width={gridW} height={4} fill="#e5e7eb" rx={2} />
        ) : (
          <text x={paddingLeft - 4} y={paddingTop + s.fretH * 0.5} fontSize={s.fontSize} fill="#9ca3af" textAnchor="end" dominantBaseline="middle">
            {baseFret}fr
          </text>
        )}

        {/* Fret lines */}
        {Array.from({ length: frets + 1 }).map((_, i) => (
          <line
            key={`fret-${i}`}
            x1={paddingLeft} y1={paddingTop + i * s.fretH}
            x2={paddingLeft + gridW} y2={paddingTop + i * s.fretH}
            stroke="#4b5563" strokeWidth={1}
          />
        ))}

        {/* String lines */}
        {Array.from({ length: strings }).map((_, i) => (
          <line
            key={`string-${i}`}
            x1={paddingLeft + i * s.fretW} y1={paddingTop}
            x2={paddingLeft + i * s.fretW} y2={paddingTop + gridH}
            stroke="#6b7280" strokeWidth={1}
          />
        ))}

        {/* Barre chords */}
        {barres.map(barreFret => (
          <rect
            key={`barre-${barreFret}`}
            x={paddingLeft}
            y={paddingTop + (barreFret - baseFret) * s.fretH + s.fretH * 0.2}
            width={gridW}
            height={s.fretH * 0.6}
            rx={s.dotR}
            fill="#f59e0b"
            opacity={0.85}
          />
        ))}

        {/* Finger dots */}
        {dotPositions.map((pos, stringIdx) => {
          if (!pos) return null;
          return (
            <circle
              key={`dot-${stringIdx}`}
              cx={pos.col}
              cy={pos.row}
              r={s.dotR}
              fill="#f59e0b"
            />
          );
        })}

        {/* Open / muted indicators above nut */}
        {fingers.map((fret, stringIdx) => {
          const col = (strings - 1 - stringIdx) * s.fretW + paddingLeft;
          const y = paddingTop - s.fretH * 0.6;
          if (fret === 0) {
            return (
              <circle key={`open-${stringIdx}`} cx={col} cy={y} r={s.dotR * 0.7}
                fill="none" stroke="#9ca3af" strokeWidth={1.5} />
            );
          }
          if (fret === -1) {
            const d = s.dotR * 0.6;
            return (
              <g key={`mute-${stringIdx}`}>
                <line x1={col - d} y1={y - d} x2={col + d} y2={y + d} stroke="#6b7280" strokeWidth={1.5} />
                <line x1={col + d} y1={y - d} x2={col - d} y2={y + d} stroke="#6b7280" strokeWidth={1.5} />
              </g>
            );
          }
          return null;
        })}
      </svg>
      <span className="text-amber-400 font-bold text-center" style={{ fontSize: s.fontSize + 2 }}>
        {chordName}
      </span>
    </div>
  );
}
