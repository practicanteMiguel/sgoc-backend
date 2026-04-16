import { Module } from '@nestjs/common';
import { CrewsModule } from './crews/crews.module';
import { LogbookModule } from './logbook/logbook.module';
import { ReportsModule } from './reports/reports.module';

@Module({
  imports: [CrewsModule, LogbookModule, ReportsModule],
  exports: [CrewsModule, LogbookModule, ReportsModule],
})
export class ActivitiesModule {}
