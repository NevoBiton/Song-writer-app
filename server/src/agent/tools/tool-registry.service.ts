import { Injectable, Logger } from '@nestjs/common';
import Anthropic from '@anthropic-ai/sdk';
import { BaseTool } from './base-tool.interface';
import { ToolResult } from '../dto/structured-data.dto';
import { ListSongsTool } from './list-songs.tool';
import { GetSongDetailsTool } from './get-song-details.tool';
import { CreateSongTool } from './create-song.tool';
import { DeleteSongTool } from './delete-song.tool';
import { UpdateSongTool } from './update-song.tool';
import { ListDeletedSongsTool } from './list-deleted-songs.tool';
import { RestoreSongTool } from './restore-song.tool';
@Injectable()
export class ToolRegistry {
  private readonly logger = new Logger(ToolRegistry.name);
  private readonly tools: Map<string, BaseTool>;

  constructor(
    listSongsTool: ListSongsTool,
    getSongDetailsTool: GetSongDetailsTool,
    createSongTool: CreateSongTool,
    deleteSongTool: DeleteSongTool,
    updateSongTool: UpdateSongTool,
    listDeletedSongsTool: ListDeletedSongsTool,
    restoreSongTool: RestoreSongTool,
  ) {
    this.tools = new Map<string, BaseTool>([
      ['list_songs', listSongsTool],
      ['get_song_details', getSongDetailsTool],
      ['create_song', createSongTool],
      ['delete_song', deleteSongTool],
      ['update_song', updateSongTool],
      ['list_deleted_songs', listDeletedSongsTool],
      ['restore_song', restoreSongTool],
    ]);

    this.logger.log(`ToolRegistry initialised with ${this.tools.size} tools: ${[...this.tools.keys()].join(', ')}`);
  }

  getDefinitions(): Anthropic.Tool[] {
    return Array.from(this.tools.values()).map(t => t.definition);
  }

  async execute(name: string, input: Record<string, unknown>, userId: string): Promise<ToolResult> {
    const tool = this.tools.get(name);
    if (!tool) {
      this.logger.warn(`Unknown tool requested: ${name}`);
      return { text: `Unknown tool: ${name}` };
    }
    this.logger.debug(`Tool call: ${name} input=${JSON.stringify(input)}`);
    return tool.execute(input, userId);
  }
}
