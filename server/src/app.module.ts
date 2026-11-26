import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import * as Joi from 'joi';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './auth/auth.module';
import { SongsModule } from './songs/songs.module';
import { UsersModule } from './users/users.module';
import { LoggerModule } from './logger/logger.module';
import { AgentModule } from './agent/agent.module';
import { GatewayModule } from './gateway/gateway.module';
import { FriendsModule } from './friends/friends.module';
import { CollaborationModule } from './collaboration/collaboration.module';
import { NotificationsModule } from './notifications/notifications.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: Joi.object({
        DATABASE_URL: Joi.string().required(),
        JWT_SECRET: Joi.string().required(),
        PORT: Joi.number().default(3001),
        GOOGLE_CLIENT_ID: Joi.string().required(),
        BREVO_API_KEY: Joi.string().required(),
        BREVO_SENDER_EMAIL: Joi.string().email().required(),
        APP_URL: Joi.string().required(),
        ALLOWED_ORIGIN: Joi.string().optional(),
        NODE_ENV: Joi.string().optional(),
        ANTHROPIC_API_KEY: Joi.string().optional(),
        LANGCHAIN_TRACING_V2: Joi.string().optional(),
        LANGCHAIN_API_KEY: Joi.string().optional(),
        LANGCHAIN_PROJECT: Joi.string().optional(),
        VOYAGE_API_KEY: Joi.string().optional(),
      }),
    }),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 100 }]),
    LoggerModule,
    DatabaseModule,
    AuthModule,
    SongsModule,
    UsersModule,
    AgentModule,
    GatewayModule,
    NotificationsModule,
    FriendsModule,
    CollaborationModule,
  ],
  controllers: [AppController],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
