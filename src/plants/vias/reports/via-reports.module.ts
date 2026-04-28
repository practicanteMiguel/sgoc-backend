import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ViaReport } from '../entities/via-report.entity';
import { ViaReportItem } from '../entities/via-report-item.entity';
import { ViaMonthlyLog } from '../entities/via-monthly-log.entity';
import { ViaCaptureGroup } from '../entities/via-capture-group.entity';
import { ViaReportsService } from './via-reports.service';
import { ViaReportsController } from './via-reports.controller';

@Module({
  imports: [TypeOrmModule.forFeature([ViaReport, ViaReportItem, ViaMonthlyLog, ViaCaptureGroup])],
  controllers: [ViaReportsController],
  providers: [ViaReportsService],
  exports: [TypeOrmModule, ViaReportsService],
})
export class ViaReportsModule {}
