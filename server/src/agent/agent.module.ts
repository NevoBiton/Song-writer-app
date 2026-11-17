import { Module } from '@nestjs/common';
import { AgentController } from './agent.controller';
import { AgentService } from './agent.service';
import { AuthModule } from '../auth/auth.module';
import { SongsModule } from '../songs/songs.module';

@Module({
  imports: [AuthModule, SongsModule],
  controllers: [AgentController],
  providers: [AgentService],
})
export class AgentModule {}
