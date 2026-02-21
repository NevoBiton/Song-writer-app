# SongWriter Pro - Hebrew & English Chord Editor

## Project Overview
A web-based songwriter notebook application that supports **Hebrew and English** lyrics with inline chord annotations. Users can click on any word (or position within a word) and assign a guitar/ukulele/piano chord that appears visually above that position — similar to SongbookPro and ChordPro format apps.

## Tech Stack
- **Frontend**: React (Vite) + TypeScript
- **Styling**: Tailwind CSS (mobile-first, responsive)
- **State**: React state + Context API (no Redux needed)
- **Storage**: localStorage for persisting songs
- **Format**: Internal ChordPro-inspired JSON format with RTL support
- **i18n**: Support for both LTR (English) and RTL (Hebrew) text rendering

## Architecture

```
src/
├── components/
│   ├── SongList/          # Song library / home screen
│   ├── SongEditor/        # Main editor: lyrics + chord placement
│   │   ├── LyricsEditor   # Editable textarea with word tokenization
│   │   ├── ChordLine      # Renders a line with chords above words
│   │   └── WordToken      # Individual clickable word/syllable
│   ├── ChordPicker/       # Modal/bottom-sheet chord selector
│   ├── ChordDiagram/      # Visual chord fingering diagram
│   └── SongViewer/        # Read-only performance view
├── data/
│   └── chords.ts          # Full chord library (guitar, ukulele)
├── hooks/
│   ├── useSong.ts         # Song CRUD operations
│   └── useChordPlacement.ts # Chord-to-word position logic
├── types/
│   └── index.ts           # TypeScript interfaces
└── utils/
    ├── chordParser.ts     # Parse/serialize ChordPro format
    ├── rtlUtils.ts        # Hebrew RTL detection & handling
    └── transpose.ts       # Key transposition logic
```

## Key Data Structures

```typescript
interface Song {
  id: string;
  title: string;
  artist?: string;
  key?: string;          // e.g. "Am", "G", "Dm"
  capo?: number;
  language: 'he' | 'en' | 'mixed';
  sections: Section[];
  createdAt: string;
  updatedAt: string;
}

interface Section {
  id: string;
  type: 'verse' | 'chorus' | 'bridge' | 'intro' | 'outro' | 'custom';
  label?: string;        // e.g. "Verse 1", "פזמון"
  lines: Line[];
}

interface Line {
  id: string;
  tokens: Token[];       // Words/syllables with optional chord
}

interface Token {
  id: string;
  text: string;          // The word or syllable text
  chord?: string;        // e.g. "Am", "G7", "Dm/F"
  isSpace?: boolean;     // For spacing tokens
}
```

## Chord Library Coverage
The app must include ALL common chords for guitar:
- **Natural chords**: C, D, E, F, G, A, B
- **Sharps & flats**: C#, Db, D#, Eb, F#, Gb, G#, Ab, A#, Bb
- **Chord qualities**: major, minor (m), 7, maj7, m7, sus2, sus4, add9, dim, aug, 6, m6, 9, m9, 11, 13
- **Slash chords**: G/B, D/F#, Am/E, etc.
- **Power chords**: A5, E5, etc.
- Total: ~200+ chord variations

## Hebrew / RTL Support Requirements
- Detect Hebrew text automatically (Unicode range \u0590-\u05FF)
- Apply `dir="rtl"` and `text-align: right` for Hebrew lines
- Chord placement works correctly in RTL: chords appear above the correct word even in right-to-left flow
- Mixed content (Hebrew lyrics with English chord names) must render correctly
- Line direction per-line (not just per-song) to support mixed songs
- Hebrew section labels: פזמון (chorus), בית (verse), גשר (bridge), הקדמה (intro)

## Core Features to Implement

### 1. Song Library
- List of all songs with title, artist, key
- Search/filter by title, artist, tag
- Create new song, delete, duplicate
- Import/export as plain text or ChordPro format

### 2. Song Editor
- Split view: edit mode and preview mode
- Typing lyrics in a rich text area (supports both Hebrew and English)
- **Click any word → chord picker opens**
- Chord appears above the selected word in real time
- Click an existing chord → edit or remove it
- Undo/redo support
- Section management (add verse, chorus, bridge, etc.)

### 3. Chord Picker (Bottom Sheet on Mobile)
- Searchable chord list
- Browse by root note → quality → variations
- Visual chord diagram (fingering grid)
- Recently used chords shown first
- Favorite/pin chords
- Quick-select row for common chords in the current key

### 4. Song Viewer (Performance Mode)
- Clean read-only display: chords above lyrics
- Auto-scroll option
- Adjustable font size
- Toggle: show/hide chords
- Dark mode support
- Landscape/portrait optimized

### 5. Key & Transposition
- Set song key
- Transpose up/down by semitone
- Capo calculator
- All chord names update automatically when transposing

## Mobile Responsiveness Rules
- All touch targets minimum 44x44px
- Bottom sheet for chord picker (not modal dialog) on mobile
- Swipe gestures for navigation
- Font size adjustable (16px minimum for readability)
- Chord picker: full-width grid on mobile, sidebar on desktop
- No horizontal scroll in song view — wrap lines intelligently

## Styling Guidelines
- **Color scheme**: Dark background with warm amber/gold chord highlights
- **Font**: System font for UI; monospace option for chord alignment
- **Chord color**: Distinct color (blue or amber) so they're instantly recognizable above lyrics
- **RTL chords**: Always display chord names LTR even when lyrics are RTL
- **Responsive breakpoints**: Mobile < 768px, Tablet 768-1024px, Desktop > 1024px

## Commands
```bash
npm install          # Install dependencies
npm run dev          # Start dev server
npm run build        # Production build
npm run lint         # ESLint check
npm run type-check   # TypeScript check
```

## Important Implementation Notes

1. **Chord-to-word alignment**: The hardest part. Chords must stay visually above their assigned word even when font size changes or window resizes. Use a token-based rendering approach (not character offset), rendering each line as a flex row of `<WordToken>` components.

2. **RTL chord alignment**: In RTL lines, the flex direction of tokens is `row-reverse`. Chords still need to appear above the correct token. Test with Hebrew text extensively.

3. **No textarea for chord display**: The chord+lyrics view is NOT a textarea — it's a custom rendered component. The edit mode uses a textarea, but the chord display is custom HTML.

4. **Chord parsing**: When user types existing ChordPro text like `[Am]שלום [G]עולם`, parse it into the token structure automatically.

5. **Persistence**: Auto-save to localStorage every 2 seconds after changes. Show "saved" indicator.

6. **Accessibility**: chord names should have `aria-label`, word tokens should be keyboard-navigable (Tab + Enter to add chord).