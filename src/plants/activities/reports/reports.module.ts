import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TechnicalReport } from './entities/technical-report.entity';
import { LogActivity } from '../logbook/entities/log-activity.entity';
import { ReportsService } from './reports.service';
import { ReportsController } from './reports.controller';

@Module({
  imports: [TypeOrmModule.forFeature([TechnicalReport, LogActivity])],
  controllers: [ReportsController],
  providers: [ReportsService],
})
export class ReportsModule {}
