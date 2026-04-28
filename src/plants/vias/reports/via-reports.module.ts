import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ViaReport } from '../entities/via-report.entity';
import { ViaReportItem } from '../entities/via-report-item.entity';
import { ViaMonthlyLog } from '../entities/via-monthly-log.entity';
import { ViaCapture } from '../entities/via-capture.entity';
import { ViaReportsService } from './via-reports.service';
import { ViaReportsController } from './via-reports.controller';

@Module({
  imports: [TypeOrmModule.forFeature([ViaReport, ViaReportItem, ViaMonthlyLog, ViaCapture])],
  controllers: [ViaReportsController],
  providers: [ViaReportsService],
  exports: [TypeOrmModule, ViaReportsService],
})
export class ViaReportsModule {}
