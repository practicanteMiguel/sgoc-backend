import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WeeklyLog } from './entities/weekly-log.entity';
import { LogActivity } from './entities/log-activity.entity';
import { Crew } from '../crews/entities/crew.entity';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { LogbookService } from './logbook.service';
import { LogbookController } from './logbook.controller';
import { VaultModule } from '../vault/vault.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([WeeklyLog, LogActivity, Crew]),
    VaultModule,
  ],
  controllers: [LogbookController],
  providers: [LogbookService, CloudinaryService],
  exports: [TypeOrmModule],
})
export class LogbookModule {}
