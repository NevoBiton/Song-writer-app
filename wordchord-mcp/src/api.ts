// ─── WordChord REST API client ────────────────────────────────────────────────

const API_URL = process.env.WORDCHORD_API_URL ?? 'http://localhost:3001/api';
const JWT_TOKEN = process.env.WORDCHORD_JWT_TOKEN ?? '';

export interface Song {
  id: string;
  title: string;
  artist?: string | null;
  key?: string | null;
  capo?: number;
  language?: string;
  sections?: unknown[];
  recentChords?: unknown[];
  createdAt?: string;
  updatedAt?: string;
}

export async function apiCall<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${JWT_TOKEN}`,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '<no body>');
    throw new Error(`API ${method} ${path} → ${res.status}: ${text}`);
  }

  // 204 No Content
  if (res.status === 204) return undefined as T;

  return res.json() as Promise<T>;
}
