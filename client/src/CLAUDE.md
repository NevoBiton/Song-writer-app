# Frontend — src/

React 18 + Vite + TypeScript SPA. See root `CLAUDE.md` for full-stack overview.

## Commands

```bash
npm run dev          # Vite dev server on :5173
npm run build        # tsc + vite build
npm run lint         # ESLint
npm run type-check   # tsc --noEmit
```

## Directory Structure

```
src/
├── components/
│   ├── ui/               # shadcn/ui primitives (button, input, card, dialog…)
│   ├── auth/
│   │   ├── LoginPage.tsx           # react-hook-form + zod login
│   │   ├── RegisterPage.tsx        # react-hook-form + zod register; shows "check your email" screen after submit
│   │   ├── ForgotPasswordPage.tsx  # Request password reset email
│   │   ├── ResetPasswordPage.tsx   # Set new password via token from email
│   │   ├── ConfirmEmailPage.tsx    # /confirm-email?token=… — confirms registration, shows success/error
│   │   └── AuthLanguageToggle.tsx  # EN/HE toggle shown on all auth pages
│   ├── Layout/
│   │   └── AppLayout.tsx      # Navbar, dark mode, language toggle, profile
│   ├── SongList/
│   │   └── SongList.tsx       # Song grid, create/import dialogs
│   ├── SongEditor/
│   │   ├── SongEditor.tsx     # Main editor with chord placement + player integration
│   │   ├── ChordLine.tsx      # Single line with chord tokens; accepts activeTokenId for highlighting
│   │   └── WordToken.tsx      # Clickable word with optional chord above; isActive prop for playback highlight
│   ├── SongPlayer/
│   │   └── PlayerBar.tsx      # Fixed bottom bar: play/pause/stop, BPM ±5, instrument selector; bilingual
│   ├── ChordPicker/
│   │   └── ChordPicker.tsx    # Chord selector (mobile sheet / desktop panel)
│   ├── ChordDiagram/          # Fingering diagram component
│   ├── Home/
│   │   └── HomePage.tsx       # Landing view for authenticated users
│   ├── ButtonWithIcon.tsx     # RTL-aware button: icon left (EN) / icon right (HE)
│   └── profile/
│       └── ProfileModal.tsx   # Edit username, email, avatar, password
├── context/
│   ├── AuthContext.tsx        # JWT auth — login/register/logout/updateUser
│   │                          #   register() calls API and returns; does NOT store token (email confirmation required)
│   ├── ThemeContext.tsx       # Dark/light mode (persisted to localStorage)
│   └── UILanguageContext.tsx  # EN/HE UI translations (persisted to localStorage)
├── hooks/
│   ├── useSongLibrary.ts      # React Query: songs list + CRUD mutations
│   ├── useSong.ts             # Local editing state (undo/redo, auto-save)
│   └── useSongPlayer.ts       # Tone.js playback: Sampler loading, Transport scheduling, active chord tracking
├── lib/
│   ├── api.ts                 # Axios instance + Bearer token interceptor
│   ├── queryClient.ts         # React Query client config
│   └── utils.ts               # shadcn cn() helper
├── utils/
│   ├── chordParser.ts         # ChordPro parse/serialize, tokenization
│   ├── chordToNotes.ts        # Chord name → Tone.js note strings with octaves (uses tonal)
│   ├── rtlUtils.ts            # Hebrew RTL detection
│   ├── songScheduler.ts       # Flatten song sections → timed ChordEvent array for Transport
│   └── transpose.ts           # Chord transposition logic
├── types/
│   ├── index.ts               # Song, Section, Line, Token interfaces
│   └── vendor.d.ts            # Manual type declarations for tonal package
├── App.tsx                    # Providers + React Router setup
└── index.css                  # Tailwind + shadcn CSS variables (light/dark); chord-pulse animation
```

## Key Patterns

### Auth Flow
- JWT stored in `localStorage` (remember me) or `sessionStorage` (session only)
- `api.ts` reads from both storages; clears both on 401
- `AuthenticatedApp` only renders when `isAuthenticated === true`
- **Registration requires email confirmation**: `register()` in `AuthContext` calls the API and returns without storing a token. `RegisterPage` shows a "check your email" screen. Login is blocked until the user clicks the confirmation link.
- **ConfirmEmailPage** (`/confirm-email?token=…`): hits `GET /api/auth/confirm-email`, uses `AbortController` to survive React Strict Mode double-invocation. Available in both authenticated and unauthenticated route trees.
- Google sign-in users bypass email confirmation (auto-confirmed server-side)

### React Query
- `useSongLibrary` uses `useQuery(['songs'])` for fetching and `useMutation` for CRUD
- Cache is updated optimistically via `setQueryData` on mutation success
- `queryClient` is configured in `src/lib/queryClient.ts`

### Forms
- Login and register use `react-hook-form` + `zod` resolver
- Field-level validation errors displayed inline
- Form elements have `id` attributes, submit buttons use `form=` to associate

### i18n
- `UILanguageContext` provides `t` object with EN/HE strings
- All UI text in `AppLayout`, `SongList`, etc. uses `t.*`
- Song content language is separate from UI language

### Dark Mode
- `ThemeContext` toggles `dark` class on `<html>`
- All colors use Tailwind CSS variable tokens (`bg-background`, `text-foreground`, etc.)
- CSS variables defined in `index.css` under `:root` (light) and `.dark`

## Data Types

```typescript
interface Song {
  id: string;
  title: string;
  artist?: string;
  key?: string;          // e.g. "Am", "G"
  capo?: number;
  bpm?: number;          // tempo, 40–200; stored in DB, adjustable per song
  language: 'he' | 'en' | 'mixed';
  sections: Section[];
  recentChords?: string[];
  createdAt: string;
  updatedAt: string;
}

interface Section {
  id: string;
  type: 'verse' | 'chorus' | 'bridge' | 'intro' | 'outro' | 'custom';
  label?: string;
  lines: Line[];
}

interface Line {
  id: string;
  tokens: Token[];
}

interface Token {
  id: string;
  text: string;
  chords?: string[];     // up to 5 chords per token (chord names, e.g. "Am", "G7")
  isSpace?: boolean;
}
```

### Song Player

- `useSongPlayer(song, initialBpm?)` — core hook; returns `{ play, pause, stop, resume, playerState, activeTokenId, bpm, setBpm, instrument, setInstrument, isLoading, hasChords }`
- Instruments use `Tone.Sampler` with samples from `nbrosowsky.github.io/tonejs-instruments` (free CDN). Samples are lazy-loaded on first play and cached for the session.
- Synth instrument uses `Tone.PolySynth(FMSynth)` — no network request needed.
- `songScheduler.ts` flattens Song sections → `ChordEvent[]` (each event has `time` in seconds, `chords: string[]`, `tokenId`). Scheduled via `Tone.Part` on `Tone.getTransport()`.
- `chordToNotes.ts` uses the `tonal` library to convert chord names (e.g. `"Am"`) to note strings with octaves (e.g. `["A3","C4","E4"]`).
- Active chord is highlighted via polling `Transport.seconds` every 100 ms → sets `activeTokenId` → `WordToken` applies `is-playing` CSS class (amber pulse animation).
- `isLoading` is `true` while CDN samples are fetching; play button shows a `Loader2` spinner and is disabled.
- `PlayerBar` is a fixed bottom bar with `no-print` class (hidden in PDF export).
- BPM changes are applied live to the Transport and persisted to the DB via `updateBpm` in `useSong`.

## Environment

Frontend expects backend at `http://localhost:3001/api`. In production the URL comes from `VITE_API_URL` (set in Vercel dashboard); `src/lib/api.ts` reads `import.meta.env.VITE_API_URL` with a fallback to the localhost address.
