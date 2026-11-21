import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CollaborationService } from './collaboration.service';
import { InviteFriendDto, SaveDraftDto, ProposeDraftDto } from './dto/index';
import { ConfigService } from '@nestjs/config';

interface JwtRequest {
  user: { id: string };
}

@Controller()
@UseGuards(JwtAuthGuard)
export class CollaborationController {
  constructor(
    private readonly collaborationService: CollaborationService,
    private readonly config: ConfigService,
  ) {}

  // ─── Collaborators ──────────────────────────────────────────────────────────

  @Get('songs/:id/collaborators')
  getCollaborators(@Param('id') id: string, @Req() req: JwtRequest) {
    return this.collaborationService.getCollaborators(id, req.user.id);
  }

  @Post('songs/:id/invite')
  inviteFriend(@Param('id') id: string, @Body() dto: InviteFriendDto, @Req() req: JwtRequest) {
    return this.collaborationService.inviteFriend(id, dto.userId, req.user.id);
  }

  @Delete('songs/:id/collaborators/:userId')
  removeCollaborator(
    @Param('id') id: string,
    @Param('userId') userId: string,
    @Req() req: JwtRequest,
  ) {
    return this.collaborationService.removeCollaborator(id, userId, req.user.id);
  }

  @Post('songs/:id/invite/accept')
  @HttpCode(HttpStatus.OK)
  acceptInvite(@Param('id') id: string, @Req() req: JwtRequest) {
    return this.collaborationService.acceptInvite(id, req.user.id);
  }

  @Post('songs/:id/invite/decline')
  @HttpCode(HttpStatus.OK)
  declineInvite(@Param('id') id: string, @Req() req: JwtRequest) {
    return this.collaborationService.declineInvite(id, req.user.id);
  }

  // ─── Invite links ────────────────────────────────────────────────────────────

  @Post('songs/:id/invite-link')
  generateInviteLink(@Param('id') id: string, @Req() req: JwtRequest) {
    const appUrl = this.config.get<string>('APP_URL') ?? 'http://localhost:5173';
    return this.collaborationService.generateInviteLink(id, req.user.id, appUrl);
  }

  // ─── Drafts ──────────────────────────────────────────────────────────────────

  @Get('songs/:id/draft')
  getDraft(@Param('id') id: string, @Req() req: JwtRequest) {
    return this.collaborationService.getOrCreateDraft(id, req.user.id);
  }

  @Put('songs/:id/draft')
  saveDraft(@Param('id') id: string, @Body() dto: SaveDraftDto, @Req() req: JwtRequest) {
    return this.collaborationService.saveDraft(id, req.user.id, dto.sections);
  }

  @Post('songs/:id/draft/propose')
  @HttpCode(HttpStatus.OK)
  propose(@Param('id') id: string, @Body() dto: ProposeDraftDto, @Req() req: JwtRequest) {
    return this.collaborationService.proposeDraft(id, req.user.id, dto.note);
  }

  // ─── Proposals ───────────────────────────────────────────────────────────────

  @Get('songs/:id/proposals')
  getProposals(@Param('id') id: string, @Req() req: JwtRequest) {
    return this.collaborationService.getProposals(id, req.user.id);
  }

  @Post('songs/:id/proposals/:draftId/accept')
  @HttpCode(HttpStatus.OK)
  acceptProposal(
    @Param('id') id: string,
    @Param('draftId') draftId: string,
    @Req() req: JwtRequest,
  ) {
    return this.collaborationService.acceptProposal(id, draftId, req.user.id);
  }

  @Post('songs/:id/proposals/:draftId/reject')
  @HttpCode(HttpStatus.OK)
  rejectProposal(
    @Param('id') id: string,
    @Param('draftId') draftId: string,
    @Req() req: JwtRequest,
  ) {
    return this.collaborationService.rejectProposal(id, draftId, req.user.id);
  }

  // ─── Versions ────────────────────────────────────────────────────────────────

  @Get('songs/:id/versions')
  getVersions(@Param('id') id: string, @Req() req: JwtRequest) {
    return this.collaborationService.getVersions(id, req.user.id);
  }
}

// ─── Public invite preview (no auth) ─────────────────────────────────────────

@Controller('invite')
export class InviteController {
  constructor(private readonly collaborationService: CollaborationService) {}

  @Get(':token')
  preview(@Param('token') token: string) {
    return this.collaborationService.previewInviteLink(token);
  }
}

// ─── Invite redeem (auth required) ───────────────────────────────────────────

@Controller('invite')
@UseGuards(JwtAuthGuard)
export class InviteRedeemController {
  constructor(private readonly collaborationService: CollaborationService) {}

  @Post(':token/join')
  @HttpCode(HttpStatus.OK)
  join(@Param('token') token: string, @Req() req: JwtRequest) {
    return this.collaborationService.redeemInviteLink(token, req.user.id);
  }
}
