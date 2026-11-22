import { Injectable } from '@nestjs/common';
import { eq, and, desc, lt, notInArray, sql } from 'drizzle-orm';
import { DatabaseService } from '../database/database.service';
import { notifications } from '../db/schema';
import { AppGateway } from '../gateway/app.gateway';

type NotificationType = typeof notifications.$inferInsert['type'];

@Injectable()
export class NotificationsService {
  constructor(
    private readonly db: DatabaseService,
    private readonly gateway: AppGateway,
  ) {}

  async create(userId: string, type: NotificationType, data: Record<string, unknown>) {
    const [notif] = await this.db.db
      .insert(notifications)
      .values({ userId, type, data })
      .returning();

    // Push real-time event so the client can update the badge immediately
    this.gateway.emitToUser(userId, 'new_notification', {
      id: notif.id,
      type: notif.type,
      data: notif.data,
      isRead: notif.isRead,
      createdAt: notif.createdAt,
    });

    return notif;
  }

  async getForUser(userId: string, cursor?: string) {
    const PAGE = 20;
    const baseCondition = eq(notifications.userId, userId);
    const cursorCondition = cursor ? lt(notifications.createdAt, new Date(cursor)) : undefined;

    const rows = await this.db.db
      .select()
      .from(notifications)
      .where(cursorCondition ? and(baseCondition, cursorCondition) : baseCondition)
      .orderBy(desc(notifications.createdAt))
      .limit(PAGE + 1); // fetch one extra to know whether more pages exist

    const hasMore = rows.length > PAGE;
    const items = hasMore ? rows.slice(0, PAGE) : rows;
    const nextCursor = hasMore ? items[items.length - 1].createdAt.toISOString() : null;

    return { items, nextCursor };
  }

  async markRead(notificationId: string, userId: string) {
    await this.db.db
      .update(notifications)
      .set({ isRead: true })
      .where(and(eq(notifications.id, notificationId), eq(notifications.userId, userId)));
    return { ok: true };
  }

  async markAllRead(userId: string) {
    await this.db.db
      .update(notifications)
      .set({ isRead: true })
      .where(eq(notifications.userId, userId));
    return { ok: true };
  }

  async markPassiveRead(userId: string) {
    // Mark only non-actionable notifications as read.
    // friend_request and collaborator_invited stay unread until the user acts on them.
    await this.db.db
      .update(notifications)
      .set({ isRead: true })
      .where(
        and(
          eq(notifications.userId, userId),
          notInArray(notifications.type, ['friend_request', 'collaborator_invited']),
        ),
      );
    return { ok: true };
  }

  async deleteNotification(notificationId: string, userId: string) {
    await this.db.db
      .delete(notifications)
      .where(and(eq(notifications.id, notificationId), eq(notifications.userId, userId)));
    return { ok: true };
  }

  /** Mark a friend_request notification as read by its friendshipId (used when
   *  the user accepts the request from outside the notification panel). */
  async markReadByFriendshipId(friendshipId: string, userId: string) {
    await this.db.db
      .update(notifications)
      .set({ isRead: true })
      .where(
        and(
          eq(notifications.userId, userId),
          eq(notifications.type, 'friend_request'),
          sql`${notifications.data}->>'friendshipId' = ${friendshipId}`,
        ),
      );
    return { ok: true };
  }

  /** Delete a friend_request notification by its friendshipId (used when the
   *  user declines the request from outside the notification panel). */
  async deleteByFriendshipId(friendshipId: string, userId: string) {
    await this.db.db
      .delete(notifications)
      .where(
        and(
          eq(notifications.userId, userId),
          eq(notifications.type, 'friend_request'),
          sql`${notifications.data}->>'friendshipId' = ${friendshipId}`,
        ),
      );
    return { ok: true };
  }
}
