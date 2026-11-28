import { Module } from "@nestjs/common";
import { AgentController } from "./agent.controller";
import { AgentService } from "./agent.service";
import { AuthModule } from "../auth/auth.module";
import { SongsModule } from "../songs/songs.module";
import { ToolRegistry } from "./tools/tool-registry.service";
import { ListSongsTool } from "./tools/list-songs.tool";
import { GetSongDetailsTool } from "./tools/get-song-details.tool";
import { CreateSongTool } from "./tools/create-song.tool";
import { DeleteSongTool } from "./tools/delete-song.tool";
import { UpdateSongTool } from "./tools/update-song.tool";
import { ListDeletedSongsTool } from "./tools/list-deleted-songs.tool";
import { RestoreSongTool } from "./tools/restore-song.tool";
import { RememberFactTool } from "./tools/remember-fact.tool";
import { GuardrailsService } from "./guardrails.service";
import { EmbeddingService } from "./embedding.service";
import { SearchSongsSemanticTool } from "./tools/search-songs-semantic.tool";
import { KnowledgeService } from "./knowledge.service";
import { SearchKnowledgeTool } from "./tools/search-knowledge.tool";
import { SkillsService } from "./skills.service";

@Module({
  imports: [AuthModule, SongsModule],
  controllers: [AgentController],
  providers: [
    AgentService,
    GuardrailsService,
    SkillsService,
    EmbeddingService,
    KnowledgeService,
    SearchSongsSemanticTool,
    SearchKnowledgeTool,
    ToolRegistry,
    ListSongsTool,
    GetSongDetailsTool,
    CreateSongTool,
    DeleteSongTool,
    UpdateSongTool,
    ListDeletedSongsTool,
    RestoreSongTool,
    RememberFactTool,
  ],
})
export class AgentModule {}
