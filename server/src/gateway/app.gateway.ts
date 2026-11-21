import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Server, Socket } from 'socket.io';
import { eq, or, and } from 'drizzle-orm';
import { DatabaseService } from '../database/database.service';
import { friendships } from '../db/schema';

interface AuthenticatedSocket extends Socket {
  userId?: string;
}

@WebSocketGateway({
  cors: { origin: '*', credentials: true },
  namespace: '/',
})
export class AppGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(AppGateway.name);

  // userId → Set of socketIds (supports multiple tabs)
  private readonly connectedUsers = new Map<string, Set<string>>();

  constructor(
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    private readonly db: DatabaseService,
  ) {}

  async handleConnection(client: AuthenticatedSocket) {
    try {
      const token =
        (client.handshake.auth as Record<string, string>)['token'] ||
        (client.handshake.headers['authorization'] as string | undefined)?.split(' ')[1];

      if (!token) {
        client.disconnect();
        return;
      }

      const payload = this.jwtService.verify<{ sub: string }>(token, {
        secret: this.config.get<string>('JWT_SECRET'),
      });

      client.userId = payload.sub;

      // Track connection
      if (!this.connectedUsers.has(payload.sub)) {
        this.connectedUsers.set(payload.sub, new Set());
      }
      this.connectedUsers.get(payload.sub)!.add(client.id);

      // If this is the first socket for this user, notify friends
      if (this.connectedUsers.get(payload.sub)!.size === 1) {
        await this.notifyFriends(payload.sub, 'friend_online', { userId: payload.sub });
      }

      this.logger.debug(`Connected: userId=${payload.sub} socketId=${client.id}`);
    } catch {
      client.disconnect();
    }
  }

  async handleDisconnect(client: AuthenticatedSocket) {
    const userId = client.userId;
    if (!userId) return;

    const sockets = this.connectedUsers.get(userId);
    if (sockets) {
      sockets.delete(client.id);
      if (sockets.size === 0) {
        this.connectedUsers.delete(userId);
        await this.notifyFriends(userId, 'friend_offline', { userId });
        this.logger.debug(`Disconnected (last socket): userId=${userId}`);
      }
    }
  }

  @SubscribeMessage('join_song')
  handleJoinSong(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { songId: string },
  ) {
    if (!client.userId || !data?.songId) return;
    const room = `song:${data.songId}`;
    void client.join(room);
    this.server.to(room).emit('song_presence', {
      songId: data.songId,
      onlineUsers: this.getRoomUsers(room),
    });
    this.logger.debug(`${client.userId} joined room ${room}`);
  }

  @SubscribeMessage('leave_song')
  handleLeaveSong(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { songId: string },
  ) {
    if (!client.userId || !data?.songId) return;
    const room = `song:${data.songId}`;
    void client.leave(room);
    this.server.to(room).emit('song_presence', {
      songId: data.songId,
      onlineUsers: this.getRoomUsers(room),
    });
  }

  // ─── Public helpers used by other services ──────────────────────────────────

  emitToUser(userId: string, event: string, data: unknown) {
    const sockets = this.connectedUsers.get(userId);
    if (!sockets) return;
    for (const socketId of sockets) {
      this.server.to(socketId).emit(event, data);
    }
  }

  emitToRoom(room: string, event: string, data: unknown) {
    this.server.to(room).emit(event, data);
  }

  isOnline(userId: string): boolean {
    return (this.connectedUsers.get(userId)?.size ?? 0) > 0;
  }

  // ─── Private helpers ────────────────────────────────────────────────────────

  private getRoomUsers(room: string): string[] {
    const roomSockets = this.server.sockets.adapter.rooms.get(room);
    if (!roomSockets) return [];
    const userIds = new Set<string>();
    for (const socketId of roomSockets) {
      const socket = this.server.sockets.sockets.get(socketId) as AuthenticatedSocket | undefined;
      if (socket?.userId) userIds.add(socket.userId);
    }
    return [...userIds];
  }

  private async notifyFriends(userId: string, event: string, data: unknown) {
    try {
      const rows = await this.db.db
        .select({ requesterId: friendships.requesterId, addresseeId: friendships.addresseeId })
        .from(friendships)
        .where(
          and(
            or(
              eq(friendships.requesterId, userId),
              eq(friendships.addresseeId, userId),
            ),
            eq(friendships.status, 'accepted'),
          ),
        );

      for (const row of rows) {
        const friendId = row.requesterId === userId ? row.addresseeId : row.requesterId;
        this.emitToUser(friendId, event, data);
      }
    } catch (err) {
      this.logger.error('notifyFriends error', err);
    }
  }
}
