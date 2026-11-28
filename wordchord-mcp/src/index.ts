import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { apiCall, Song } from './api.js';

// ─── Startup validation ───────────────────────────────────────────────────────

if (!process.env.WORDCHORD_JWT_TOKEN) {
  console.error('[wordchord-mcp] WORDCHORD_JWT_TOKEN is not set — exiting.');
  process.exit(1);
}

// ─── Server ───────────────────────────────────────────────────────────────────

const server = new McpServer({
  name: 'wordchord',
  version: '1.0.0',
});

// ─── Resources ───────────────────────────────────────────────────────────────
// Resources expose read-only data that clients can subscribe to or browse.

server.registerResource(
  'song-library',
  'wordchord://songs',
  {
    title: 'Song Library',
    description: "Read-only snapshot of all songs in the user's WordChord library.",
    mimeType: 'application/json',
  },
  async () => {
    const songs = await apiCall<Song[]>('GET', '/songs');
    return {
      contents: [
        {
          uri: 'wordchord://songs',
          mimeType: 'application/json',
          text: JSON.stringify(songs, null, 2),
        },
      ],
    };
  },
);

// ─── Tools ───────────────────────────────────────────────────────────────────

server.registerTool(
  'list_songs',
  {
    title: 'List Songs',
    description: "Return all songs in the user's WordChord library.",
    annotations: { readOnlyHint: true },
  },
  async () => {
    const songs = await apiCall<Song[]>('GET', '/songs');
    return { content: [{ type: 'text' as const, text: JSON.stringify(songs, null, 2) }] };
  },
);

server.registerTool(
  'get_song',
  {
    title: 'Get Song',
    description: 'Return full details of a single song by ID.',
    inputSchema: {
      id: z.string().describe('Song ID'),
    },
    annotations: { readOnlyHint: true, idempotentHint: true },
  },
  async ({ id }) => {
    const song = await apiCall<Song>('GET', `/songs/${id}`);
    return { content: [{ type: 'text' as const, text: JSON.stringify(song, null, 2) }] };
  },
);

server.registerTool(
  'search_songs',
  {
    title: 'Search Songs',
    description: 'Search the song library by title or artist name. Returns all matching songs.',
    inputSchema: {
      query: z.string().min(1).describe('Search query (matches title or artist)'),
    },
    annotations: { readOnlyHint: true },
  },
  async ({ query }) => {
    const songs = await apiCall<Song[]>('GET', '/songs');
    const q = query.toLowerCase();
    const matches = songs.filter(
      s =>
        (s.title ?? '').toLowerCase().includes(q) ||
        (s.artist ?? '').toLowerCase().includes(q),
    );
    return { content: [{ type: 'text' as const, text: JSON.stringify(matches, null, 2) }] };
  },
);

server.registerTool(
  'create_song',
  {
    title: 'Create Song',
    description: 'Create a new song in the WordChord library.',
    inputSchema: {
      title:  z.string().min(1).describe('Song title'),
      artist: z.string().optional().describe('Artist name'),
      key:    z.string().optional().describe('Musical key (e.g. "C", "Am", "F#")'),
      capo:   z.number().int().min(0).max(12).optional().describe('Capo fret number (0–12)'),
    },
    annotations: { destructiveHint: false, idempotentHint: false },
  },
  async (args) => {
    const song = await apiCall<Song>('POST', '/songs', args);
    return { content: [{ type: 'text' as const, text: JSON.stringify(song, null, 2) }] };
  },
);

server.registerTool(
  'update_song',
  {
    title: 'Update Song',
    description: "Update a song's metadata. Only the fields you provide will change.",
    inputSchema: {
      id:     z.string().describe('Song ID to update'),
      title:  z.string().min(1).optional().describe('New title'),
      artist: z.string().optional().describe('New artist name'),
      key:    z.string().optional().describe('New musical key (e.g. "G", "Em")'),
      capo:   z.number().int().min(0).max(12).optional().describe('New capo fret (0–12)'),
    },
    annotations: { destructiveHint: false, idempotentHint: true },
  },
  async ({ id, ...updates }) => {
    const song = await apiCall<Song>('PUT', `/songs/${id}`, updates);
    return { content: [{ type: 'text' as const, text: JSON.stringify(song, null, 2) }] };
  },
);

server.registerTool(
  'delete_song',
  {
    title: 'Delete Song',
    description:
      'Soft-delete a song (moves it to trash). It can be restored within 30 days via restore_song.',
    inputSchema: {
      id: z.string().describe('Song ID to delete'),
    },
    annotations: { destructiveHint: true, idempotentHint: false },
  },
  async ({ id }) => {
    await apiCall<void>('DELETE', `/songs/${id}`);
    return { content: [{ type: 'text' as const, text: `Song ${id} moved to trash.` }] };
  },
);

server.registerTool(
  'list_deleted_songs',
  {
    title: 'List Deleted Songs',
    description: 'List songs currently in the trash (deleted within the last 30 days).',
    annotations: { readOnlyHint: true },
  },
  async () => {
    const songs = await apiCall<Song[]>('GET', '/songs/deleted');
    return { content: [{ type: 'text' as const, text: JSON.stringify(songs, null, 2) }] };
  },
);

server.registerTool(
  'restore_song',
  {
    title: 'Restore Song',
    description: 'Restore a soft-deleted song from the trash back to the library.',
    inputSchema: {
      id: z.string().describe('Deleted song ID to restore'),
    },
    annotations: { destructiveHint: false, idempotentHint: true },
  },
  async ({ id }) => {
    const song = await apiCall<Song>('POST', `/songs/deleted/${id}/restore`);
    return { content: [{ type: 'text' as const, text: JSON.stringify(song, null, 2) }] };
  },
);

// ─── Start ────────────────────────────────────────────────────────────────────

const transport = new StdioServerTransport();
await server.connect(transport);
console.error('[wordchord-mcp] running on stdio');
