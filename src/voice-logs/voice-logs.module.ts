import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VoiceLog } from './entities/voice-log.entity';
import { VoiceLogsController } from './voice-logs.controller';
import { VoiceLogsService } from './voice-logs.service';

@Module({
  imports: [TypeOrmModule.forFeature([VoiceLog])],
  controllers: [VoiceLogsController],
  providers: [VoiceLogsService],
})
export class VoiceLogsModule {}
