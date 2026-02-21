import { Line, Token, Section } from '../types';

function uid(): string {
  return Math.random().toString(36).slice(2, 10);
}

/**
 * Parse a ChordPro line like "[Am]Hello [G]world" into tokens.
 * Returns an array of Token objects.
 */
export function parseChordProLine(lineText: string): Token[] {
  const tokens: Token[] = [];
  // Split on chord markers [...]
  const parts = lineText.split(/(\[[^\]]*\])/);
  let pendingChord: string | undefined;

  for (const part of parts) {
    const chordMatch = part.match(/^\[([^\]]*)\]$/);
    if (chordMatch) {
      pendingChord = chordMatch[1];
    } else if (part) {
      // Split into words and spaces
      const wordParts = part.split(/(\s+)/);
      for (const wp of wordParts) {
        if (!wp) continue;
        if (/^\s+$/.test(wp)) {
          tokens.push({ id: uid(), text: wp, isSpace: true });
        } else {
          tokens.push({ id: uid(), text: wp, chord: pendingChord });
          pendingChord = undefined;
        }
      }
    }
  }

  // If there's a dangling chord at end, attach to empty token
  if (pendingChord !== undefined) {
    tokens.push({ id: uid(), text: '', chord: pendingChord });
  }

  return tokens;
}

/**
 * Parse a full ChordPro text block into Line[] for a section.
 */
export function parseChordPro(text: string): Line[] {
  return text.split('\n').map(lineText => ({
    id: uid(),
    tokens: parseChordProLine(lineText),
  }));
}

/**
 * Parse the full ChordPro document into sections.
 * Supports {title:}, {artist:}, {key:}, {sov}/{eov}, {soc}/{eoc}, {c:} directives.
 */
export function parseChordProDocument(text: string): {
  title?: string;
  artist?: string;
  key?: string;
  sections: Section[];
} {
  const lines = text.split('\n');
  let title: string | undefined;
  let artist: string | undefined;
  let key: string | undefined;
  const sections: Section[] = [];
  let currentSection: Section | null = null;
  let currentLines: string[] = [];

  function flushSection() {
    if (currentSection && currentLines.length > 0) {
      const nonEmptyLines = currentLines.filter(l => l.trim() !== '');
      if (nonEmptyLines.length > 0) {
        currentSection.lines = currentLines.map(l => ({
          id: uid(),
          tokens: parseChordProLine(l),
        }));
        sections.push(currentSection);
      }
    }
    currentSection = null;
    currentLines = [];
  }

  for (const raw of lines) {
    const line = raw.trim();

    // Directives
    const directiveMatch = line.match(/^\{([^:}]+)(?::([^}]*))?\}$/);
    if (directiveMatch) {
      const directive = directiveMatch[1].trim().toLowerCase();
      const value = (directiveMatch[2] || '').trim();

      switch (directive) {
        case 'title': case 't': title = value; break;
        case 'artist': case 'st': artist = value; break;
        case 'key': key = value; break;
        case 'sov': case 'start_of_verse':
          flushSection();
          currentSection = { id: uid(), type: 'verse', label: 'Verse', lines: [] };
          break;
        case 'eov': case 'end_of_verse':
          flushSection();
          break;
        case 'soc': case 'start_of_chorus':
          flushSection();
          currentSection = { id: uid(), type: 'chorus', label: 'Chorus', lines: [] };
          break;
        case 'eoc': case 'end_of_chorus':
          flushSection();
          break;
        case 'sob': case 'start_of_bridge':
          flushSection();
          currentSection = { id: uid(), type: 'bridge', label: 'Bridge', lines: [] };
          break;
        case 'eob': case 'end_of_bridge':
          flushSection();
          break;
        case 'c': case 'comment':
          if (currentSection) currentSection.label = value;
          break;
      }
      continue;
    }

    // Regular line
    if (!currentSection) {
      // Auto-create a verse section if we see lyric content
      if (line && (line.includes('[') || /[a-zA-Z\u0590-\u05FF]/.test(line))) {
        currentSection = { id: uid(), type: 'verse', label: 'Verse', lines: [] };
      }
    }
    if (currentSection) {
      currentLines.push(raw);
    }
  }
  flushSection();

  return { title, artist, key, sections };
}

/**
 * Serialize Line[] back to ChordPro inline format.
 */
export function serializeToChordPro(lines: Line[]): string {
  return lines.map(line => {
    return line.tokens.map(token => {
      const chordPart = token.chord ? `[${token.chord}]` : '';
      return `${chordPart}${token.text}`;
    }).join('');
  }).join('\n');
}

/**
 * Convert plain text (no chords) into tokenized Line[].
 */
export function tokenizeLines(text: string): Line[] {
  return text.split('\n').map(lineText => {
    const parts = lineText.split(/(\s+)/);
    const tokens: Token[] = parts
      .filter(p => p !== '')
      .map(p => ({
        id: uid(),
        text: p,
        isSpace: /^\s+$/.test(p),
      }));
    return { id: uid(), tokens };
  });
}

/**
 * Get plain text from a section's lines (strips chords).
 */
export function sectionToPlainText(lines: Line[]): string {
  return lines.map(line =>
    line.tokens.map(t => t.text).join('')
  ).join('\n');
}

/**
 * Get ChordPro text from a section's lines.
 */
export function sectionToChordPro(lines: Line[]): string {
  return serializeToChordPro(lines);
}
