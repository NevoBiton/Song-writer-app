import { Injectable } from '@nestjs/common';
import { eq, and, desc } from 'drizzle-orm';
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

  async getForUser(userId: string) {
    return this.db.db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, userId))
      .orderBy(desc(notifications.createdAt))
      .limit(50);
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

  async deleteNotification(notificationId: string, userId: string) {
    await this.db.db
      .delete(notifications)
      .where(and(eq(notifications.id, notificationId), eq(notifications.userId, userId)));
    return { ok: true };
  }
}
