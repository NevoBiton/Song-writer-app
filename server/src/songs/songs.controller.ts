import {
  Controller, Get, Post, Put, Patch, Delete,
  Param, Body, Req, UseGuards, HttpCode,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Request } from 'express';
import { SongsService } from './songs.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateSongDto } from './dto/create-song.dto';
import { UpdateSongDto } from './dto/update-song.dto';
import { RecentChordsDto } from './dto/recent-chords.dto';

interface AuthRequest extends Request {
  user: { id: string };
}

@ApiTags('Songs')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('songs')
export class SongsController {
  constructor(private readonly songsService: SongsService) {}

  @Get()
  @ApiOperation({ summary: "List the authenticated user's songs" })
  @ApiResponse({ status: 200, description: 'Array of songs' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  findAll(@Req() req: AuthRequest) {
    return this.songsService.findAll(req.user.id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new song' })
  @ApiResponse({ status: 201, description: 'Song created' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  create(@Req() req: AuthRequest, @Body() dto: CreateSongDto) {
    return this.songsService.create(req.user.id, dto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a song' })
  @ApiResponse({ status: 200, description: 'Song updated' })
  @ApiResponse({ status: 404, description: 'Song not found or not owned by user' })
  update(@Param('id') id: string, @Req() req: AuthRequest, @Body() dto: UpdateSongDto) {
    return this.songsService.update(id, req.user.id, dto);
  }

  @Patch(':id/recent-chords')
  @HttpCode(200)
  @ApiOperation({ summary: 'Update recently used chords for a song' })
  @ApiResponse({ status: 200, description: 'Recent chords updated' })
  updateRecentChords(
    @Param('id') id: string,
    @Req() req: AuthRequest,
    @Body() dto: RecentChordsDto,
  ) {
    return this.songsService.updateRecentChords(id, req.user.id, dto.chords);
  }

  @Delete(':id')
  @HttpCode(200)
  @ApiOperation({ summary: 'Soft-delete a song (moves to trash)' })
  @ApiResponse({ status: 200, description: 'Song moved to trash' })
  @ApiResponse({ status: 404, description: 'Song not found or not owned by user' })
  softDelete(@Param('id') id: string, @Req() req: AuthRequest) {
    return this.songsService.softDelete(id, req.user.id);
  }

  @Get('deleted')
  @ApiOperation({ summary: 'List deleted songs (last 30 days)' })
  @ApiResponse({ status: 200, description: 'Array of deleted songs' })
  listDeleted(@Req() req: AuthRequest) {
    return this.songsService.listDeleted(req.user.id);
  }

  @Post('deleted/:id/restore')
  @ApiOperation({ summary: 'Restore a deleted song back to the library' })
  @ApiResponse({ status: 201, description: 'Song restored' })
  @ApiResponse({ status: 404, description: 'Deleted song not found' })
  restore(@Param('id') id: string, @Req() req: AuthRequest) {
    return this.songsService.restore(id, req.user.id);
  }

  @Delete('deleted/:id')
  @HttpCode(200)
  @ApiOperation({ summary: 'Permanently delete a song from trash' })
  @ApiResponse({ status: 200, description: 'Song permanently deleted' })
  @ApiResponse({ status: 404, description: 'Deleted song not found' })
  permanentDelete(@Param('id') id: string, @Req() req: AuthRequest) {
    return this.songsService.permanentDelete(id, req.user.id);
  }
}
