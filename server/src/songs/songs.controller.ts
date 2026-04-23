import {
  Controller, Get, Post, Put, Patch, Delete,
  Param, Body, Req, UseGuards, HttpCode,
} from '@nestjs/common';
import { Request } from 'express';
import { SongsService } from './songs.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateSongDto } from './dto/create-song.dto';
import { UpdateSongDto } from './dto/update-song.dto';
import { RecentChordsDto } from './dto/recent-chords.dto';

interface AuthRequest extends Request {
  user: { id: string };
}

@UseGuards(JwtAuthGuard)
@Controller('songs')
export class SongsController {
  constructor(private readonly songsService: SongsService) {}

  @Get()
  findAll(@Req() req: AuthRequest) {
    return this.songsService.findAll(req.user.id);
  }

  @Post()
  create(@Req() req: AuthRequest, @Body() dto: CreateSongDto) {
    return this.songsService.create(req.user.id, dto);
  }

  @Put(':id')
  update(@Param('id') id: string, @Req() req: AuthRequest, @Body() dto: UpdateSongDto) {
    return this.songsService.update(id, req.user.id, dto);
  }

  @Patch(':id/recent-chords')
  @HttpCode(200)
  updateRecentChords(
    @Param('id') id: string,
    @Req() req: AuthRequest,
    @Body() dto: RecentChordsDto,
  ) {
    return this.songsService.updateRecentChords(id, req.user.id, dto.chords);
  }

  @Delete(':id')
  @HttpCode(200)
  softDelete(@Param('id') id: string, @Req() req: AuthRequest) {
    return this.songsService.softDelete(id, req.user.id);
  }

  @Get('deleted')
  listDeleted(@Req() req: AuthRequest) {
    return this.songsService.listDeleted(req.user.id);
  }

  @Post('deleted/:id/restore')
  restore(@Param('id') id: string, @Req() req: AuthRequest) {
    return this.songsService.restore(id, req.user.id);
  }

  @Delete('deleted/:id')
  @HttpCode(200)
  permanentDelete(@Param('id') id: string, @Req() req: AuthRequest) {
    return this.songsService.permanentDelete(id, req.user.id);
  }
}
