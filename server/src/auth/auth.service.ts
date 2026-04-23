import { Injectable, Logger, BadRequestException, UnauthorizedException, ConflictException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { DatabaseService } from '../database/database.service';
import { users, passwordResetTokens } from '../db/schema';
import { eq, and, gt, isNull } from 'drizzle-orm';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'node:crypto';
import { OAuth2Client } from 'google-auth-library';
import { Resend } from 'resend';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { GoogleAuthDto } from './dto/google-auth.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

type UserPayload = { id: string; email: string; username: string; avatar: string | null };

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly googleClient: OAuth2Client;
  private readonly resend: Resend;

  constructor(
    private readonly db: DatabaseService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {
    this.googleClient = new OAuth2Client(this.config.get<string>('GOOGLE_CLIENT_ID'));
    this.resend = new Resend(this.config.get<string>('RESEND_API_KEY'));
  }

  private signToken(userId: string): string {
    return this.jwtService.sign({ sub: userId });
  }

  private toUserPayload(user: { id: string; email: string; username: string; avatar: string | null }): UserPayload {
    return { id: user.id, email: user.email, username: user.username, avatar: user.avatar };
  }

  async register(dto: RegisterDto) {
    const passwordHash = await bcrypt.hash(dto.password, 10);
    try {
      const [user] = await this.db.db
        .insert(users)
        .values({ email: dto.email, username: dto.username, passwordHash })
        .returning();
      this.logger.log(`User registered: ${user.email}`);
      return { token: this.signToken(user.id), user: this.toUserPayload(user) };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '';
      if (msg.includes('unique')) throw new ConflictException('Email already taken');
      throw err;
    }
  }

  async login(dto: LoginDto) {
    const [user] = await this.db.db.select().from(users).where(eq(users.email, dto.email));
    if (!user) {
      this.logger.warn(`Failed login attempt — email not found: ${dto.email}`);
      throw new UnauthorizedException('Invalid email or password');
    }
    if (!user.passwordHash) {
      this.logger.warn(`Failed login attempt — Google-only account: ${dto.email}`);
      throw new UnauthorizedException('This account uses Google sign-in. Use "Continue with Google" to log in.');
    }
    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) {
      this.logger.warn(`Failed login attempt — wrong password: ${dto.email}`);
      throw new UnauthorizedException('Invalid email or password');
    }
    this.logger.log(`User logged in: ${user.email}`);
    return { token: this.signToken(user.id), user: this.toUserPayload(user) };
  }

  async googleAuth(dto: GoogleAuthDto) {
    let googleSub: string;
    let googleEmail: string;
    let googlePicture: string | undefined;

    try {
      const ticket = await this.googleClient.verifyIdToken({
        idToken: dto.credential,
        audience: this.config.get<string>('GOOGLE_CLIENT_ID')!,
      });
      const payload = ticket.getPayload();
      if (!payload?.email) throw new BadRequestException('Invalid Google token');
      googleSub = payload.sub;
      googleEmail = payload.email;
      googlePicture = payload.picture;
    } catch (err) {
      if (err instanceof BadRequestException) throw err;
      throw new UnauthorizedException('Google token verification failed');
    }

    let [user] = await this.db.db.select().from(users).where(eq(users.googleId, googleSub));

    if (!user) {
      const [byEmail] = await this.db.db.select().from(users).where(eq(users.email, googleEmail));
      if (byEmail) {
        const [updated] = await this.db.db
          .update(users)
          .set({ googleId: googleSub })
          .where(eq(users.id, byEmail.id))
          .returning();
        user = updated;
      } else {
        const base = googleEmail.split('@')[0].replace(/[^a-zA-Z0-9_]/g, '').slice(0, 20) || 'user';
        const suffix = crypto.randomBytes(3).toString('hex');
        const [created] = await this.db.db
          .insert(users)
          .values({ email: googleEmail, username: `${base}_${suffix}`, googleId: googleSub, avatar: googlePicture ?? null })
          .returning();
        user = created;
      }
    }

    return { token: this.signToken(user.id), user: this.toUserPayload(user) };
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    const isHebrew = dto.lang === 'he';
    const OK = { message: 'If an account with that email exists, a reset link has been sent.' };

    const [user] = await this.db.db.select().from(users).where(eq(users.email, dto.email));
    if (!user) return OK;

    const rawToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
    await this.db.db.insert(passwordResetTokens).values({ userId: user.id, token: rawToken, expiresAt });

    const appUrl = this.config.get<string>('APP_URL');
    const resetUrl = `${appUrl}/reset-password?token=${rawToken}&lang=${isHebrew ? 'he' : 'en'}`;

    await this.resend.emails.send({
      from: 'WordChord <onboarding@resend.dev>',
      to: user.email,
      subject: isHebrew ? 'איפוס סיסמה ל-WordChord' : 'Reset your WordChord password',
      html: isHebrew
        ? `<div dir="rtl" style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px;text-align:right">
            <h2 style="color:#111827">איפוס סיסמה</h2>
            <p style="color:#374151">היי ${user.username},</p>
            <p style="color:#374151">קיבלנו בקשה לאיפוס הסיסמה שלך ב-WordChord. לחץ על הכפתור למטה — הקישור תקף לשעה אחת.</p>
            <a href="${resetUrl}" style="display:inline-block;background:#fbbf24;color:#111827;font-weight:700;padding:12px 24px;border-radius:8px;text-decoration:none;margin:16px 0">אפס סיסמה</a>
            <p style="color:#6b7280;font-size:13px">אם לא ביקשת את זה, אפשר פשוט להתעלם מהמייל הזה.</p>
            <p style="color:#9ca3af;font-size:12px">${resetUrl}</p>
          </div>`
        : `<div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
            <h2 style="color:#111827">Reset your password</h2>
            <p style="color:#374151">Hi ${user.username},</p>
            <p style="color:#374151">We received a request to reset your WordChord password. Click the button below — the link expires in 1 hour.</p>
            <a href="${resetUrl}" style="display:inline-block;background:#fbbf24;color:#111827;font-weight:700;padding:12px 24px;border-radius:8px;text-decoration:none;margin:16px 0">Reset Password</a>
            <p style="color:#6b7280;font-size:13px">If you didn't request this, you can safely ignore this email.</p>
            <p style="color:#9ca3af;font-size:12px">${resetUrl}</p>
          </div>`,
    });

    return OK;
  }

  async verifyResetToken(token: string): Promise<{ valid: boolean }> {
    const now = new Date();
    const [resetToken] = await this.db.db
      .select()
      .from(passwordResetTokens)
      .where(
        and(
          eq(passwordResetTokens.token, token),
          isNull(passwordResetTokens.usedAt),
          gt(passwordResetTokens.expiresAt, now),
        ),
      );
    return { valid: !!resetToken };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const now = new Date();
    const [resetToken] = await this.db.db
      .select()
      .from(passwordResetTokens)
      .where(
        and(
          eq(passwordResetTokens.token, dto.token),
          isNull(passwordResetTokens.usedAt),
          gt(passwordResetTokens.expiresAt, now),
        ),
      );

    if (!resetToken) throw new BadRequestException('This reset link is invalid or has expired.');

    await this.db.db
      .update(passwordResetTokens)
      .set({ usedAt: now })
      .where(eq(passwordResetTokens.id, resetToken.id));

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const [user] = await this.db.db
      .update(users)
      .set({ passwordHash })
      .where(eq(users.id, resetToken.userId))
      .returning();

    if (!user) throw new BadRequestException('User not found');

    return { token: this.signToken(user.id), user: this.toUserPayload(user) };
  }
}
