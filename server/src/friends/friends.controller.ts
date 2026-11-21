import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  Query,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { FriendsService } from './friends.service';
import { SendRequestDto } from './dto/send-request.dto';

interface JwtRequest {
  user: { id: string };
}

@Controller('friends')
@UseGuards(JwtAuthGuard)
export class FriendsController {
  constructor(private readonly friendsService: FriendsService) {}

  @Get('search')
  search(@Query('q') q: string, @Req() req: JwtRequest) {
    return this.friendsService.searchUsers(q, req.user.id);
  }

  @Post('request')
  sendRequest(@Body() dto: SendRequestDto, @Req() req: JwtRequest) {
    return this.friendsService.sendRequest(req.user.id, dto.email);
  }

  @Get('requests')
  getRequests(@Req() req: JwtRequest) {
    return this.friendsService.getPendingRequests(req.user.id);
  }

  @Post(':id/accept')
  @HttpCode(HttpStatus.OK)
  accept(@Param('id') id: string, @Req() req: JwtRequest) {
    return this.friendsService.acceptRequest(id, req.user.id);
  }

  @Post(':id/decline')
  @HttpCode(HttpStatus.OK)
  decline(@Param('id') id: string, @Req() req: JwtRequest) {
    return this.friendsService.declineRequest(id, req.user.id);
  }

  @Delete(':id')
  unfriend(@Param('id') id: string, @Req() req: JwtRequest) {
    return this.friendsService.unfriend(id, req.user.id);
  }

  @Get()
  getFriends(@Req() req: JwtRequest) {
    return this.friendsService.getFriends(req.user.id);
  }
}
