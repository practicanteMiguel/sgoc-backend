import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TechnicalReport } from './entities/technical-report.entity';
import { WeeklyLog } from '../logbook/entities/weekly-log.entity';
import { ReportsService } from './reports.service';
import { ReportsController } from './reports.controller';

@Module({
  imports: [TypeOrmModule.forFeature([TechnicalReport, WeeklyLog])],
  controllers: [ReportsController],
  providers: [ReportsService],
})
export class ReportsModule {}
