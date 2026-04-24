import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { users } from '../db/schema';
import { eq } from 'drizzle-orm';
import * as bcrypt from 'bcryptjs';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(private readonly db: DatabaseService) {}

  async getProfile(userId: string) {
    const [user] = await this.db.db.select().from(users).where(eq(users.id, userId));
    if (!user) throw new NotFoundException('User not found');
    return { id: user.id, email: user.email, username: user.username, avatar: user.avatar };
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const updates: Partial<{ username: string; email: string; avatar: string | null }> = {};
    if (dto.username !== undefined) updates.username = dto.username;
    if (dto.email !== undefined) updates.email = dto.email;
    if (dto.avatar !== undefined) updates.avatar = dto.avatar;

    if (Object.keys(updates).length === 0) {
      throw new BadRequestException('Nothing to update');
    }

    const changedFields = Object.keys(updates);
    try {
      const [user] = await this.db.db
        .update(users)
        .set(updates)
        .where(eq(users.id, userId))
        .returning();
      this.logger.log(`Profile updated: user=${userId} fields=[${changedFields.join(', ')}]`);
      if (updates.avatar !== undefined) {
        this.logger.log(`Avatar changed: user=${userId} newAvatar=${updates.avatar ?? 'null'}`);
      }
      return { id: user.id, email: user.email, username: user.username, avatar: user.avatar };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '';
      if (msg.includes('unique')) throw new ConflictException('Email already taken');
      throw err;
    }
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    const [user] = await this.db.db.select().from(users).where(eq(users.id, userId));
    if (!user) throw new NotFoundException('User not found');
    if (!user.passwordHash) {
      this.logger.warn(`Password change failed: user=${userId} — Google-only account`);
      throw new BadRequestException('This account uses Google sign-in and has no password to change.');
    }
    const valid = await bcrypt.compare(dto.currentPassword, user.passwordHash);
    if (!valid) {
      this.logger.warn(`Password change failed: user=${userId} — wrong current password`);
      throw new ForbiddenException('Current password is incorrect');
    }

    const passwordHash = await bcrypt.hash(dto.newPassword, 10);
    await this.db.db.update(users).set({ passwordHash }).where(eq(users.id, userId));
    this.logger.log(`Password changed: user=${userId}`);
    return { success: true };
  }
}
