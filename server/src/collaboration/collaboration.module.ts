import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import {
  CollaborationController,
  InviteController,
  InviteRedeemController,
} from './collaboration.controller';
import { CollaborationService } from './collaboration.service';

@Module({
  imports: [AuthModule],
  controllers: [CollaborationController, InviteController, InviteRedeemController],
  providers: [CollaborationService],
  exports: [CollaborationService],
})
export class CollaborationModule {}
