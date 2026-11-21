import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { eq, or, and, ilike, ne } from 'drizzle-orm';
import { DatabaseService } from '../database/database.service';
import { friendships, users } from '../db/schema';
import { AppGateway } from '../gateway/app.gateway';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class FriendsService {
  constructor(
    private readonly db: DatabaseService,
    private readonly gateway: AppGateway,
    private readonly notificationsService: NotificationsService,
  ) {}

  async searchUsers(query: string, currentUserId: string) {
    if (!query || query.trim().length < 2) return [];

    const results = await this.db.db
      .select({ id: users.id, username: users.username, avatar: users.avatar })
      .from(users)
      .where(and(ilike(users.username, `%${query.trim()}%`), ne(users.id, currentUserId)))
      .limit(20);

    return results;
  }

  async sendRequest(requesterId: string, addresseeEmail: string) {
    // Find target user by email (guaranteed unique)
    const [addressee] = await this.db.db
      .select({ id: users.id, username: users.username })
      .from(users)
      .where(eq(users.email, addresseeEmail.toLowerCase().trim()));

    if (!addressee) throw new NotFoundException('User not found');
    if (addressee.id === requesterId) throw new ConflictException('Cannot add yourself');

    // Check for existing friendship
    const [existing] = await this.db.db
      .select()
      .from(friendships)
      .where(
        or(
          and(eq(friendships.requesterId, requesterId), eq(friendships.addresseeId, addressee.id)),
          and(eq(friendships.requesterId, addressee.id), eq(friendships.addresseeId, requesterId)),
        ),
      );

    if (existing) {
      if (existing.status === 'accepted') throw new ConflictException('Already friends');
      if (existing.status === 'pending') throw new ConflictException('Request already pending');
    }

    const [friendship] = await this.db.db
      .insert(friendships)
      .values({ requesterId, addresseeId: addressee.id, status: 'pending' })
      .returning();

    // Get requester info for notification
    const [requester] = await this.db.db
      .select({ id: users.id, username: users.username, avatar: users.avatar })
      .from(users)
      .where(eq(users.id, requesterId));

    // Notify addressee via WebSocket
    this.gateway.emitToUser(addressee.id, 'friend_request', {
      friendship,
      from: requester,
    });

    // Persist notification
    await this.notificationsService.create(addressee.id, 'friend_request', {
      friendshipId: friendship.id,
      fromUserId: requester.id,
      fromUsername: requester.username,
      fromAvatar: requester.avatar ?? null,
    });

    return friendship;
  }

  async getPendingRequests(userId: string) {
    const rows = await this.db.db
      .select({
        id: friendships.id,
        status: friendships.status,
        createdAt: friendships.createdAt,
        requesterId: friendships.requesterId,
        requesterUsername: users.username,
        requesterAvatar: users.avatar,
      })
      .from(friendships)
      .innerJoin(users, eq(users.id, friendships.requesterId))
      .where(and(eq(friendships.addresseeId, userId), eq(friendships.status, 'pending')));

    return rows;
  }

  async acceptRequest(friendshipId: string, userId: string) {
    const [friendship] = await this.db.db
      .select()
      .from(friendships)
      .where(eq(friendships.id, friendshipId));

    if (!friendship) throw new NotFoundException('Friend request not found');
    if (friendship.addresseeId !== userId) throw new ForbiddenException();
    if (friendship.status !== 'pending') throw new ConflictException('Request is not pending');

    const [updated] = await this.db.db
      .update(friendships)
      .set({ status: 'accepted' })
      .where(eq(friendships.id, friendshipId))
      .returning();

    // Notify requester
    const [accepter] = await this.db.db
      .select({ id: users.id, username: users.username, avatar: users.avatar })
      .from(users)
      .where(eq(users.id, userId));

    this.gateway.emitToUser(friendship.requesterId, 'friend_accepted', {
      friendship: updated,
      by: accepter,
    });

    // Persist notification for the requester
    await this.notificationsService.create(friendship.requesterId, 'friend_accepted', {
      friendshipId,
      byUserId: accepter.id,
      byUsername: accepter.username,
      byAvatar: accepter.avatar ?? null,
    });

    return updated;
  }

  async declineRequest(friendshipId: string, userId: string) {
    const [friendship] = await this.db.db
      .select()
      .from(friendships)
      .where(eq(friendships.id, friendshipId));

    if (!friendship) throw new NotFoundException('Friend request not found');
    if (friendship.addresseeId !== userId) throw new ForbiddenException();

    const [updated] = await this.db.db
      .update(friendships)
      .set({ status: 'declined' })
      .where(eq(friendships.id, friendshipId))
      .returning();

    return updated;
  }

  async unfriend(friendshipId: string, userId: string) {
    const [friendship] = await this.db.db
      .select()
      .from(friendships)
      .where(eq(friendships.id, friendshipId));

    if (!friendship) throw new NotFoundException('Friendship not found');
    if (friendship.requesterId !== userId && friendship.addresseeId !== userId) {
      throw new ForbiddenException();
    }

    await this.db.db.delete(friendships).where(eq(friendships.id, friendshipId));

    // Notify the other user so their UI updates without a refresh
    const otherUserId =
      friendship.requesterId === userId ? friendship.addresseeId : friendship.requesterId;
    this.gateway.emitToUser(otherUserId, 'friend_removed', { friendshipId });

    return { ok: true };
  }

  async getFriends(userId: string) {
    const rows = await this.db.db
      .select({
        id: friendships.id,
        status: friendships.status,
        friendId: users.id,
        username: users.username,
        avatar: users.avatar,
      })
      .from(friendships)
      .innerJoin(
        users,
        or(
          and(eq(friendships.requesterId, userId), eq(users.id, friendships.addresseeId)),
          and(eq(friendships.addresseeId, userId), eq(users.id, friendships.requesterId)),
        ),
      )
      .where(and(
        eq(friendships.status, 'accepted'),
        or(
          eq(friendships.requesterId, userId),
          eq(friendships.addresseeId, userId),
        ),
      ));

    return rows.map(r => ({
      id: r.id,
      friendId: r.friendId,
      username: r.username,
      avatar: r.avatar,
      online: this.gateway.isOnline(r.friendId),
    }));
  }
}
