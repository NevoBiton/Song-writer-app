import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AgentService } from './agent.service';
import { AgentChatDto } from './dto/agent-chat.dto';

interface JwtUser {
  id: string;
}

@Controller('agent')
@UseGuards(JwtAuthGuard)
export class AgentController {
  constructor(private readonly agentService: AgentService) {}

  @Post('chat')
  async chat(@Body() dto: AgentChatDto, @Req() req: { user: JwtUser }) {
    const reply = await this.agentService.chat(req.user.id, dto.messages, dto.lang ?? 'en');
    return { reply };
  }
}
