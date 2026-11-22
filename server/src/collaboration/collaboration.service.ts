import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { eq, and, or } from 'drizzle-orm';
import { randomBytes } from 'crypto';
import { DatabaseService } from '../database/database.service';
import {
  songCollaborators,
  songDrafts,
  songVersions,
  inviteLinks,
  songs,
  users,
  friendships,
} from '../db/schema';
import { AppGateway } from '../gateway/app.gateway';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class CollaborationService {
  constructor(
    private readonly db: DatabaseService,
    private readonly gateway: AppGateway,
    private readonly notificationsService: NotificationsService,
  ) {}

  // ─── Helpers ────────────────────────────────────────────────────────────────

  private async getSongOrThrow(songId: string) {
    const [song] = await this.db.db.select().from(songs).where(eq(songs.id, songId));
    if (!song) throw new NotFoundException('Song not found');
    return song;
  }

  private async getCollaboratorOrThrow(songId: string, userId: string) {
    const [col] = await this.db.db
      .select()
      .from(songCollaborators)
      .where(
        and(
          eq(songCollaborators.songId, songId),
          eq(songCollaborators.userId, userId),
          eq(songCollaborators.status, 'accepted'),
        ),
      );
    if (!col) throw new ForbiddenException('Not a collaborator');
    return col;
  }

  async isCollaborator(songId: string, userId: string): Promise<boolean> {
    const [col] = await this.db.db
      .select()
      .from(songCollaborators)
      .where(
        and(
          eq(songCollaborators.songId, songId),
          eq(songCollaborators.userId, userId),
          eq(songCollaborators.status, 'accepted'),
        ),
      );
    return !!col;
  }

  // ─── Collaborators ──────────────────────────────────────────────────────────

  async getCollaborators(songId: string, requesterId: string) {
    // Must be owner or accepted collaborator
    const song = await this.getSongOrThrow(songId);
    if (song.userId !== requesterId && !(await this.isCollaborator(songId, requesterId))) {
      throw new ForbiddenException();
    }

    return this.db.db
      .select({
        id: songCollaborators.id,
        userId: songCollaborators.userId,
        role: songCollaborators.role,
        status: songCollaborators.status,
        joinedAt: songCollaborators.joinedAt,
        username: users.username,
        avatar: users.avatar,
      })
      .from(songCollaborators)
      .innerJoin(users, eq(users.id, songCollaborators.userId))
      .where(eq(songCollaborators.songId, songId));
  }

  async inviteFriend(songId: string, inviteeId: string, inviterId: string) {
    const song = await this.getSongOrThrow(songId);
    if (song.userId !== inviterId) throw new ForbiddenException('Only owner can invite');

    // Must be friends
    const [friendship] = await this.db.db
      .select()
      .from(friendships)
      .where(
        and(
          or(
            and(eq(friendships.requesterId, inviterId), eq(friendships.addresseeId, inviteeId)),
            and(eq(friendships.requesterId, inviteeId), eq(friendships.addresseeId, inviterId)),
          ),
          eq(friendships.status, 'accepted'),
        ),
      );

    if (!friendship) throw new ForbiddenException('Must be friends to invite');

    // Already invited or a collaborator?
    const [existing] = await this.db.db
      .select()
      .from(songCollaborators)
      .where(and(eq(songCollaborators.songId, songId), eq(songCollaborators.userId, inviteeId)));
    if (existing) throw new ConflictException('Already invited or a collaborator');

    const [col] = await this.db.db
      .insert(songCollaborators)
      .values({ songId, userId: inviteeId, role: 'editor', invitedBy: inviterId, status: 'pending' })
      .returning();

    // Get inviter's username for the notification
    const [inviterUser] = await this.db.db
      .select({ username: users.username })
      .from(users)
      .where(eq(users.id, inviterId));

    // Notify invitee via real-time socket + persistent notification
    this.gateway.emitToUser(inviteeId, 'collaborator_invited', {
      songId,
      songTitle: song.title,
      invitedByUsername: inviterUser?.username ?? 'Someone',
    });

    await this.notificationsService.create(inviteeId, 'collaborator_invited', {
      songId,
      songTitle: song.title,
      invitedByUserId: inviterId,
      invitedByUsername: inviterUser?.username ?? 'Someone',
    });

    return col;
  }

  async acceptInvite(songId: string, userId: string) {
    const song = await this.getSongOrThrow(songId);

    const [invite] = await this.db.db
      .select()
      .from(songCollaborators)
      .where(
        and(
          eq(songCollaborators.songId, songId),
          eq(songCollaborators.userId, userId),
          eq(songCollaborators.status, 'pending'),
        ),
      );

    if (!invite) throw new NotFoundException('No pending invite found');

    await this.db.db
      .update(songCollaborators)
      .set({ status: 'accepted', joinedAt: new Date() })
      .where(eq(songCollaborators.id, invite.id));

    const [joiner] = await this.db.db
      .select({ username: users.username })
      .from(users)
      .where(eq(users.id, userId));

    // Notify owner that someone accepted their invite
    this.gateway.emitToUser(song.userId, 'collaborator_joined', {
      songId,
      user: { id: userId, username: joiner?.username },
    });

    await this.notificationsService.create(song.userId, 'collaborator_joined', {
      songId,
      songTitle: song.title,
      joinedUserId: userId,
      joinedUsername: joiner?.username ?? 'Someone',
    });

    return { ok: true };
  }

  async removeCollaborator(songId: string, targetUserId: string, requesterId: string) {
    const song = await this.getSongOrThrow(songId);
    const isSelfRemoval = targetUserId === requesterId;
    if (!isSelfRemoval && song.userId !== requesterId) {
      throw new ForbiddenException('Only owner can remove collaborators');
    }

    const [row] = await this.db.db
      .select()
      .from(songCollaborators)
      .where(and(eq(songCollaborators.songId, songId), eq(songCollaborators.userId, targetUserId)));

    if (!row) throw new NotFoundException('Collaborator not found');

    await this.db.db
      .delete(songCollaborators)
      .where(eq(songCollaborators.id, row.id));

    // Notify the removed user
    this.gateway.emitToUser(targetUserId, 'collaborator_removed', { songId, songTitle: song.title });

    // When a collaborator leaves voluntarily, also notify the owner so their panel updates
    if (isSelfRemoval) {
      this.gateway.emitToUser(song.userId, 'collaborator_removed', { songId, songTitle: song.title });
    }

    return { ok: true };
  }

  async declineInvite(songId: string, userId: string) {
    const [invite] = await this.db.db
      .select()
      .from(songCollaborators)
      .where(
        and(
          eq(songCollaborators.songId, songId),
          eq(songCollaborators.userId, userId),
          eq(songCollaborators.status, 'pending'),
        ),
      );

    if (!invite) throw new NotFoundException('No pending invite found');

    await this.db.db
      .delete(songCollaborators)
      .where(eq(songCollaborators.id, invite.id));

    return { ok: true };
  }

  // ─── Invite links ────────────────────────────────────────────────────────────

  async generateInviteLink(songId: string, creatorId: string, appUrl: string) {
    const song = await this.getSongOrThrow(songId);
    if (song.userId !== creatorId) throw new ForbiddenException('Only owner can create invite links');

    const token = randomBytes(24).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    const [link] = await this.db.db
      .insert(inviteLinks)
      .values({ songId, createdBy: creatorId, token, expiresAt })
      .returning();

    return {
      url: `${appUrl}/invite/${token}`,
      expiresAt: link.expiresAt,
      token: link.token,
    };
  }

  async previewInviteLink(token: string) {
    const [link] = await this.db.db
      .select()
      .from(inviteLinks)
      .where(eq(inviteLinks.token, token));

    if (!link || link.expiresAt < new Date()) {
      throw new NotFoundException('Invite link not found or expired');
    }

    const [song] = await this.db.db
      .select({ title: songs.title })
      .from(songs)
      .where(eq(songs.id, link.songId));

    const [inviter] = await this.db.db
      .select({ username: users.username })
      .from(users)
      .where(eq(users.id, link.createdBy));

    return {
      songId: link.songId,
      songTitle: song?.title ?? 'Unknown song',
      invitedBy: inviter?.username ?? 'Someone',
      expiresAt: link.expiresAt,
    };
  }

  async redeemInviteLink(token: string, userId: string) {
    const [link] = await this.db.db
      .select()
      .from(inviteLinks)
      .where(eq(inviteLinks.token, token));

    if (!link || link.expiresAt < new Date()) {
      throw new NotFoundException('Invite link not found or expired');
    }

    // Check if already a collaborator (or owner)
    const [song] = await this.db.db.select().from(songs).where(eq(songs.id, link.songId));
    if (song?.userId === userId) throw new ConflictException('You are the owner of this song');

    // Check any existing row (pending or accepted)
    const [existing] = await this.db.db
      .select()
      .from(songCollaborators)
      .where(and(eq(songCollaborators.songId, link.songId), eq(songCollaborators.userId, userId)));
    if (existing) throw new ConflictException('Already a collaborator or invited');

    const [col] = await this.db.db
      .insert(songCollaborators)
      .values({ songId: link.songId, userId, role: 'editor', invitedBy: link.createdBy, status: 'accepted' })
      .returning();

    // Increment used count
    await this.db.db
      .update(inviteLinks)
      .set({ usedCount: (link.usedCount ?? 0) + 1 })
      .where(eq(inviteLinks.id, link.id));

    const [joiner] = await this.db.db
      .select({ username: users.username })
      .from(users)
      .where(eq(users.id, userId));

    // Notify owner
    this.gateway.emitToUser(song!.userId, 'collaborator_joined', {
      songId: link.songId,
      user: { id: userId, username: joiner?.username },
    });

    await this.notificationsService.create(song!.userId, 'collaborator_joined', {
      songId: link.songId,
      songTitle: song!.title,
      joinedUserId: userId,
      joinedUsername: joiner?.username ?? 'Someone',
    });

    return col;
  }

  // ─── Drafts ──────────────────────────────────────────────────────────────────

  async getOrCreateDraft(songId: string, userId: string) {
    await this.getSongOrThrow(songId);
    if (!(await this.isCollaborator(songId, userId))) throw new ForbiddenException();

    const [existing] = await this.db.db
      .select()
      .from(songDrafts)
      .where(
        and(
          eq(songDrafts.songId, songId),
          eq(songDrafts.userId, userId),
          eq(songDrafts.status, 'draft'),
        ),
      );

    if (existing) return existing;

    // Seed draft from current song sections
    const [song] = await this.db.db.select().from(songs).where(eq(songs.id, songId));
    const [draft] = await this.db.db
      .insert(songDrafts)
      .values({ songId, userId, sections: song.sections ?? [], status: 'draft' })
      .returning();

    return draft;
  }

  async saveDraft(songId: string, userId: string, sections: unknown[]) {
    await this.getSongOrThrow(songId);
    if (!(await this.isCollaborator(songId, userId))) throw new ForbiddenException();

    const [existing] = await this.db.db
      .select()
      .from(songDrafts)
      .where(
        and(
          eq(songDrafts.songId, songId),
          eq(songDrafts.userId, userId),
          eq(songDrafts.status, 'draft'),
        ),
      );

    const now = new Date();

    if (existing) {
      const [updated] = await this.db.db
        .update(songDrafts)
        .set({ sections, updatedAt: now })
        .where(eq(songDrafts.id, existing.id))
        .returning();
      return updated;
    }

    const [draft] = await this.db.db
      .insert(songDrafts)
      .values({ songId, userId, sections, status: 'draft' })
      .returning();
    return draft;
  }

  async proposeDraft(songId: string, userId: string, note?: string) {
    if (!(await this.isCollaborator(songId, userId))) throw new ForbiddenException();

    const song = await this.getSongOrThrow(songId);

    const [draft] = await this.db.db
      .select()
      .from(songDrafts)
      .where(
        and(
          eq(songDrafts.songId, songId),
          eq(songDrafts.userId, userId),
          eq(songDrafts.status, 'draft'),
        ),
      );

    if (!draft) throw new NotFoundException('No active draft found');

    const [proposed] = await this.db.db
      .update(songDrafts)
      .set({ status: 'proposed', note: note ?? null, updatedAt: new Date() })
      .where(eq(songDrafts.id, draft.id))
      .returning();

    const [proposer] = await this.db.db
      .select({ username: users.username })
      .from(users)
      .where(eq(users.id, userId));

    // Emit directly to the song owner (not to a room — rooms may be empty)
    this.gateway.emitToUser(song.userId, 'song_proposal', {
      songId,
      draftId: draft.id,
      proposedBy: { id: userId, username: proposer?.username },
      note,
    });

    await this.notificationsService.create(song.userId, 'proposal_submitted', {
      songId,
      songTitle: song.title,
      draftId: draft.id,
      proposedByUserId: userId,
      proposedByUsername: proposer?.username ?? 'Someone',
      note: note ?? null,
    });

    return proposed;
  }

  async getProposals(songId: string, requesterId: string) {
    const song = await this.getSongOrThrow(songId);
    if (song.userId !== requesterId && !(await this.isCollaborator(songId, requesterId))) {
      throw new ForbiddenException();
    }

    return this.db.db
      .select({
        id: songDrafts.id,
        userId: songDrafts.userId,
        sections: songDrafts.sections,
        status: songDrafts.status,
        note: songDrafts.note,
        updatedAt: songDrafts.updatedAt,
        username: users.username,
        avatar: users.avatar,
      })
      .from(songDrafts)
      .innerJoin(users, eq(users.id, songDrafts.userId))
      .where(and(eq(songDrafts.songId, songId), eq(songDrafts.status, 'proposed')));
  }

  async acceptProposal(songId: string, draftId: string, ownerId: string) {
    const song = await this.getSongOrThrow(songId);
    if (song.userId !== ownerId) throw new ForbiddenException('Only owner can accept proposals');

    const [draft] = await this.db.db
      .select()
      .from(songDrafts)
      .where(and(eq(songDrafts.id, draftId), eq(songDrafts.songId, songId)));

    if (!draft || draft.status !== 'proposed') throw new NotFoundException('Proposal not found');

    // Snapshot current version before applying
    await this.db.db
      .insert(songVersions)
      .values({ songId, sections: song.sections ?? [], proposedBy: draft.userId });

    // Apply sections to song
    await this.db.db
      .update(songs)
      .set({ sections: draft.sections as unknown[], updatedAt: new Date() })
      .where(eq(songs.id, songId));

    // Mark draft as accepted
    await this.db.db
      .update(songDrafts)
      .set({ status: 'accepted', updatedAt: new Date() })
      .where(eq(songDrafts.id, draftId));

    // Emit song_updated to all accepted collaborators (not via room — rooms may be empty)
    const collaborators = await this.db.db
      .select({ userId: songCollaborators.userId })
      .from(songCollaborators)
      .where(
        and(
          eq(songCollaborators.songId, songId),
          eq(songCollaborators.status, 'accepted'),
        ),
      );

    for (const col of collaborators) {
      this.gateway.emitToUser(col.userId, 'song_updated', {
        songId,
        newSections: draft.sections,
      });
    }

    // Notify the collaborator who proposed these changes
    await this.notificationsService.create(draft.userId, 'proposal_accepted', {
      songId,
      songTitle: song.title,
    });

    return { ok: true, sections: draft.sections };
  }

  async rejectProposal(songId: string, draftId: string, ownerId: string) {
    const song = await this.getSongOrThrow(songId);
    if (song.userId !== ownerId) throw new ForbiddenException('Only owner can reject proposals');

    const [draft] = await this.db.db
      .select()
      .from(songDrafts)
      .where(and(eq(songDrafts.id, draftId), eq(songDrafts.songId, songId)));

    if (!draft || draft.status !== 'proposed') throw new NotFoundException('Proposal not found');

    await this.db.db
      .update(songDrafts)
      .set({ status: 'rejected', updatedAt: new Date() })
      .where(eq(songDrafts.id, draftId));

    this.gateway.emitToUser(draft.userId, 'proposal_rejected', {
      songId,
      draftId,
    });

    await this.notificationsService.create(draft.userId, 'proposal_rejected', {
      songId,
      songTitle: song.title,
    });

    return { ok: true };
  }

  // ─── Versions ────────────────────────────────────────────────────────────────

  async getVersions(songId: string, requesterId: string) {
    const song = await this.getSongOrThrow(songId);
    if (song.userId !== requesterId && !(await this.isCollaborator(songId, requesterId))) {
      throw new ForbiddenException();
    }

    return this.db.db
      .select({
        id: songVersions.id,
        sections: songVersions.sections,
        createdAt: songVersions.createdAt,
        proposedBy: songVersions.proposedBy,
        username: users.username,
      })
      .from(songVersions)
      .innerJoin(users, eq(users.id, songVersions.proposedBy))
      .where(eq(songVersions.songId, songId));
  }
}
