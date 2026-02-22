import { Router, Response } from 'express';
import { db } from '../db';
import { songs } from '../db/schema';
import { eq, and } from 'drizzle-orm';
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
  const { id } = req.params;
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

// DELETE /api/songs/:id
router.delete('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  const { id } = req.params;

  try {
    const [deleted] = await db
      .delete(songs)
      .where(and(eq(songs.id, id), eq(songs.userId, req.user!.id)))
      .returning({ id: songs.id });

    if (!deleted) {
      res.status(404).json({ error: 'Song not found' });
      return;
    }

    res.json({ success: true });
  } catch (err) {
    console.error('Delete song error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
