import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

const API_URL = process.env.WORDCHORD_API_URL ?? 'http://localhost:3001/api';
const JWT_TOKEN = process.env.WORDCHORD_JWT_TOKEN ?? '';

// ─── HTTP helper ────────────────────────────────────────────────────────────

async function apiCall(method: string, path: string, body?: unknown) {
  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${JWT_TOKEN}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(`API error ${res.status}: ${await res.text()}`);
  return res.json() as Promise<unknown>;
}

// ─── MCP Server ─────────────────────────────────────────────────────────────

const server = new Server(
  { name: 'wordchord', version: '1.0.0' },
  { capabilities: { tools: {} } },
);

// ─── Tool definitions ────────────────────────────────────────────────────────

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: 'list_songs',
      description: "List all songs in the user's WordChord library",
      inputSchema: { type: 'object', properties: {}, required: [] },
    },
    {
      name: 'get_song',
      description: 'Get the full details of a specific song by its ID',
      inputSchema: {
        type: 'object',
        properties: {
          id: { type: 'string', description: 'The song ID' },
        },
        required: ['id'],
      },
    },
    {
      name: 'create_song',
      description: 'Create a new song in the WordChord library',
      inputSchema: {
        type: 'object',
        properties: {
          title:  { type: 'string', description: 'Song title' },
          artist: { type: 'string', description: 'Artist name (optional)' },
          key:    { type: 'string', description: 'Musical key e.g. "C", "Am" (optional)' },
          capo:   { type: 'number', description: 'Capo fret number (optional)' },
        },
        required: ['title'],
      },
    },
    {
      name: 'delete_song',
      description: 'Delete a song from the WordChord library by its ID',
      inputSchema: {
        type: 'object',
        properties: {
          id: { type: 'string', description: 'The song ID to delete' },
        },
        required: ['id'],
      },
    },
    {
      name: 'search_songs',
      description: 'Search songs by title or artist using text matching',
      inputSchema: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Search query' },
        },
        required: ['query'],
      },
    },
  ],
}));

// ─── Tool implementations ────────────────────────────────────────────────────

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  const a = (args ?? {}) as Record<string, unknown>;

  try {
    switch (name) {
      case 'list_songs': {
        const songs = await apiCall('GET', '/songs');
        return { content: [{ type: 'text', text: JSON.stringify(songs, null, 2) }] };
      }

      case 'get_song': {
        const song = await apiCall('GET', `/songs/${a.id}`);
        return { content: [{ type: 'text', text: JSON.stringify(song, null, 2) }] };
      }

      case 'create_song': {
        const song = await apiCall('POST', '/songs', a);
        return { content: [{ type: 'text', text: JSON.stringify(song, null, 2) }] };
      }

      case 'delete_song': {
        await apiCall('DELETE', `/songs/${a.id}`);
        return { content: [{ type: 'text', text: `Song ${a.id} deleted successfully.` }] };
      }

      case 'search_songs': {
        const songs = await apiCall('GET', '/songs') as Array<Record<string, unknown>>;
        const query = String(a.query).toLowerCase();
        const matches = songs.filter(s =>
          String(s.title ?? '').toLowerCase().includes(query) ||
          String(s.artist ?? '').toLowerCase().includes(query),
        );
        return { content: [{ type: 'text', text: JSON.stringify(matches, null, 2) }] };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (err) {
    return {
      content: [{ type: 'text', text: `Error: ${(err as Error).message}` }],
      isError: true,
    };
  }
});

// ─── Start ───────────────────────────────────────────────────────────────────

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('WordChord MCP server running on stdio');
}

main().catch(console.error);
