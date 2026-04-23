import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';
import { VoiceLogsService } from './voice-logs.service';
import { GenerateReportDto } from './dto/generate-report.dto';
import { QueryVoiceLogsDto } from './dto/query-voice-logs.dto';

const ALLOWED_AUDIO_TYPES = [
  'audio/mpeg',
  'audio/mp3',
  'audio/wav',
  'audio/wave',
  'audio/ogg',
  'audio/flac',
  'audio/webm',
  'audio/mp4',
  'audio/x-m4a',
  'video/webm',
];

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('voice-logs')
export class VoiceLogsController {
  constructor(private readonly service: VoiceLogsService) {}

  @Post('transcribe')
  @UseInterceptors(
    FileInterceptor('audio', {
      storage: memoryStorage(),
      limits: { fileSize: 25 * 1024 * 1024 },
    }),
  )
  transcribe(
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: User,
  ) {
    if (!file) throw new BadRequestException('Se requiere un archivo de audio');
    if (!ALLOWED_AUDIO_TYPES.includes(file.mimetype)) {
      throw new BadRequestException(
        `Tipo de archivo no soportado: ${file.mimetype}`,
      );
    }
    return this.service.transcribeAndSave(file, user.id);
  }

  @Get()
  findAll(
    @CurrentUser() user: User & { roles: string[] },
    @Query() query: QueryVoiceLogsDto,
  ) {
    const isAdmin = user.roles?.includes('admin');

    if (query.user_id) {
      if (!isAdmin) throw new ForbiddenException();
      return this.service.findByUser(query.user_id, query);
    }

    if (isAdmin) return this.service.findAllAdmin(query);

    return this.service.findByUser(user.id, query);
  }

  @Get(':id')
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ) {
    return this.service.findOne(id, user.id);
  }

  @Delete(':id')
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ) {
    return this.service.remove(id, user.id);
  }

  @Post('report')
  generateReport(
    @Body() dto: GenerateReportDto,
    @CurrentUser() user: User,
  ) {
    return this.service.generateReport(dto, user.id);
  }
}
