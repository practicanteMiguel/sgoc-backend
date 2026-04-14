import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

// Entidades
import { Deliverable } from './entities/deliverable.entity';
import { TaxiRecord } from './entities/taxi-record.entity';
import { PernoctacionRecord } from './entities/pernoctacion-record.entity';
import { DisponibilidadRecord } from './entities/disponibilidad-record.entity';
import { HorasExtraRecord } from './entities/horas-extra-record.entity';
import { Schedule } from './entities/schedule.entity';
import { ScheduleDay } from './entities/schedule-day.entity';
import { EvidenceFile } from './entities/evidence-file.entity';
import { DriveFolderCache } from './entities/drive-folder-cache.entity';

// Dependencias externas
import { Field } from '../plants/fields/entities/field.entity';
import { Employee } from '../plants/employees/entities/employee.entity';

// Services y Controllers
import { DeliverablesService } from './deliverables.service';
import { DeliverablesController } from './deliverables.controller';
import { FormatsService } from './formats.service';
import { FormatsController } from './formats.controller';
import { SchedulesService } from './schedules.service';
import { SchedulesController } from './schedules.controller';
import { EvidencesService } from './evidences.service';
import { EvidencesController } from './evidences.controller';

import { DriveModule } from '../drive/drive.module';

@Module({
  imports: [
    DriveModule,
    TypeOrmModule.forFeature([
      Deliverable,
      TaxiRecord,
      PernoctacionRecord,
      DisponibilidadRecord,
      HorasExtraRecord,
      Schedule,
      ScheduleDay,
      EvidenceFile,
      DriveFolderCache,
      Field,
      Employee,
    ]),
  ],
  controllers: [
    DeliverablesController,
    FormatsController,
    SchedulesController,
    EvidencesController,
  ],
  providers: [
    DeliverablesService,
    FormatsService,
    SchedulesService,
    EvidencesService,
  ],
})
export class ComplianceModule {}
