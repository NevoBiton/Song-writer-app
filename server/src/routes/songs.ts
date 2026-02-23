import { Router, Response } from 'express';
import { db } from '../db';
import { songs, deletedSongs } from '../db/schema';
import { eq, and, gte } from 'drizzle-orm';
import { requireAuth, AuthRequest } from '../middleware/auth';

const router = Router();

// All song routes require auth
router.use(requireAuth);

// GET /api/songs
router.get('/', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userSongs = await db
      .select()
      .from(songs)
      .where(eq(songs.userId, req.user!.id))
      .orderBy(songs.updatedAt);

    res.json(userSongs);
  } catch (err) {
    console.error('List songs error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/songs
router.post('/', async (req: AuthRequest, res: Response): Promise<void> => {
  const { title, artist, key, capo, language, sections } = req.body;

  if (!title) {
    res.status(400).json({ error: 'title is required' });
    return;
  }

  try {
    const [song] = await db
      .insert(songs)
      .values({
        userId: req.user!.id,
        title,
        artist: artist || null,
        key: key || null,
        capo: capo ?? 0,
        language: language || 'en',
        sections: sections || [],
      })
      .returning();

    res.status(201).json(song);
  } catch (err) {
    console.error('Create song error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/songs/:id
router.put('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  const id = req.params.id as string;
  const { title, artist, key, capo, language, sections } = req.body;

  try {
    const [song] = await db
      .update(songs)
      .set({
        title,
        artist: artist || null,
        key: key || null,
        capo: capo ?? 0,
        language: language || 'en',
        sections: sections || [],
        updatedAt: new Date(),
      })
      .where(and(eq(songs.id, id), eq(songs.userId, req.user!.id)))
      .returning();

    if (!song) {
      res.status(404).json({ error: 'Song not found' });
      return;
    }

    res.json(song);
  } catch (err) {
    console.error('Update song error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/songs/:id  — soft delete (move to deleted_songs)
router.delete('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  const id = req.params.id as string;

  try {
    const [song] = await db
      .delete(songs)
      .where(and(eq(songs.id, id), eq(songs.userId, req.user!.id)))
      .returning();

    if (!song) {
      res.status(404).json({ error: 'Song not found' });
      return;
    }

    await db.insert(deletedSongs).values({
      id: song.id,
      userId: song.userId,
      title: song.title,
      artist: song.artist,
      key: song.key,
      capo: song.capo,
      language: song.language,
      sections: song.sections,
      createdAt: song.createdAt,
      updatedAt: song.updatedAt,
      deletedAt: new Date(),
    });

    res.json({ success: true });
  } catch (err) {
    console.error('Delete song error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/songs/deleted — list deleted songs (last 30 days)
router.get('/deleted', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const deleted = await db
      .select()
      .from(deletedSongs)
      .where(and(eq(deletedSongs.userId, req.user!.id), gte(deletedSongs.deletedAt, thirtyDaysAgo)))
      .orderBy(deletedSongs.deletedAt);

    res.json(deleted);
  } catch (err) {
    console.error('List deleted songs error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/songs/deleted/:id/restore — restore a deleted song
router.post('/deleted/:id/restore', async (req: AuthRequest, res: Response): Promise<void> => {
  const id = req.params.id as string;

  try {
    const [deleted] = await db
      .delete(deletedSongs)
      .where(and(eq(deletedSongs.id, id), eq(deletedSongs.userId, req.user!.id)))
      .returning();

    if (!deleted) {
      res.status(404).json({ error: 'Deleted song not found' });
      return;
    }

    const [restored] = await db.insert(songs).values({
      id: deleted.id,
      userId: deleted.userId,
      title: deleted.title,
      artist: deleted.artist,
      key: deleted.key,
      capo: deleted.capo ?? 0,
      language: deleted.language ?? 'en',
      sections: deleted.sections,
      createdAt: deleted.createdAt,
      updatedAt: new Date(),
    }).returning();

    res.json(restored);
  } catch (err) {
    console.error('Restore song error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/songs/deleted/:id — permanently delete
router.delete('/deleted/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  const id = req.params.id as string;

  try {
    const [deleted] = await db
      .delete(deletedSongs)
      .where(and(eq(deletedSongs.id, id), eq(deletedSongs.userId, req.user!.id)))
      .returning({ id: deletedSongs.id });

    if (!deleted) {
      res.status(404).json({ error: 'Deleted song not found' });
      return;
    }

    res.json({ success: true });
  } catch (err) {
    console.error('Permanent delete error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
