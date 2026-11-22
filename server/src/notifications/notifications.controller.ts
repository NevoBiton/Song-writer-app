import {
  Controller, Get, Patch, Delete, Post, Param, UseGuards, Req,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { NotificationsService } from './notifications.service';

@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  getAll(@Req() req: { user: { id: string } }) {
    return this.notificationsService.getForUser(req.user.id);
  }

  @Post('read-all')
  markAllRead(@Req() req: { user: { id: string } }) {
    return this.notificationsService.markAllRead(req.user.id);
  }

  @Post('read-passive')
  markPassiveRead(@Req() req: { user: { id: string } }) {
    return this.notificationsService.markPassiveRead(req.user.id);
  }

  @Patch(':id/read')
  markRead(@Param('id') id: string, @Req() req: { user: { id: string } }) {
    return this.notificationsService.markRead(id, req.user.id);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Req() req: { user: { id: string } }) {
    return this.notificationsService.deleteNotification(id, req.user.id);
  }

  @Patch('read-by-friendship/:friendshipId')
  markReadByFriendship(
    @Param('friendshipId') friendshipId: string,
    @Req() req: { user: { id: string } },
  ) {
    return this.notificationsService.markReadByFriendshipId(friendshipId, req.user.id);
  }

  @Delete('by-friendship/:friendshipId')
  deleteByFriendship(
    @Param('friendshipId') friendshipId: string,
    @Req() req: { user: { id: string } },
  ) {
    return this.notificationsService.deleteByFriendshipId(friendshipId, req.user.id);
  }
}
