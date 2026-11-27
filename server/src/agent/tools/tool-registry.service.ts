import { Injectable, Logger } from '@nestjs/common';
import { DynamicStructuredTool } from '@langchain/core/tools';
import { RunContext } from '../dto/structured-data.dto';
import { ListSongsTool } from './list-songs.tool';
import { GetSongDetailsTool } from './get-song-details.tool';
import { CreateSongTool } from './create-song.tool';
import { DeleteSongTool } from './delete-song.tool';
import { UpdateSongTool } from './update-song.tool';
import { ListDeletedSongsTool } from './list-deleted-songs.tool';
import { RestoreSongTool } from './restore-song.tool';
import { RememberFactTool } from './remember-fact.tool';
import { SearchSongsSemanticTool } from './search-songs-semantic.tool';
import { SearchKnowledgeTool } from './search-knowledge.tool';

@Injectable()
export class ToolRegistry {
  private readonly logger = new Logger(ToolRegistry.name);

  constructor(
    private readonly listSongsTool: ListSongsTool,
    private readonly getSongDetailsTool: GetSongDetailsTool,
    private readonly createSongTool: CreateSongTool,
    private readonly deleteSongTool: DeleteSongTool,
    private readonly updateSongTool: UpdateSongTool,
    private readonly listDeletedSongsTool: ListDeletedSongsTool,
    private readonly restoreSongTool: RestoreSongTool,
    private readonly rememberFactTool: RememberFactTool,
    private readonly searchSongsSemanticTool: SearchSongsSemanticTool,
    private readonly searchKnowledgeTool: SearchKnowledgeTool,
  ) {}

  build(userId: string, runContext: RunContext): DynamicStructuredTool[] {
    const tools = [
      this.listSongsTool.build(userId, runContext),
      this.getSongDetailsTool.build(userId),
      this.createSongTool.build(userId),
      this.deleteSongTool.build(userId),
      this.updateSongTool.build(userId),
      this.listDeletedSongsTool.build(userId),
      this.restoreSongTool.build(userId),
      this.rememberFactTool.build(userId),
      this.searchSongsSemanticTool.build(userId),
      this.searchKnowledgeTool.build(),
    ];
    this.logger.log(`Built ${tools.length} LangChain tools: ${tools.map(t => t.name).join(', ')}`);
    return tools;
  }
}
