import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TechnicalReport } from './entities/technical-report.entity';
import { WeeklyLog } from '../logbook/entities/weekly-log.entity';
import { LogActivity } from '../logbook/entities/log-activity.entity';
import { ReportsService } from './reports.service';
import { ReportsController } from './reports.controller';

@Module({
  imports: [TypeOrmModule.forFeature([TechnicalReport, WeeklyLog, LogActivity])],
  controllers: [ReportsController],
  providers: [ReportsService],
})
export class ReportsModule {}
