import { Module } from '@nestjs/common';
import { SongsController } from './songs.controller';
import { SongsService } from './songs.service';
import { AuthModule } from '../auth/auth.module';
import { EmbeddingService } from '../agent/embedding.service';

@Module({
  imports: [AuthModule],
  controllers: [SongsController],
  providers: [SongsService, EmbeddingService],
  exports: [SongsService, EmbeddingService],
})
export class SongsModule {}
