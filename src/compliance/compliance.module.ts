import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

// Entidades
import { Deliverable } from './deliverables/deliverable.entity';
import { TaxiRecord } from './formats/taxi-record.entity';
import { PernoctacionRecord } from './formats/pernoctacion-record.entity';
import { DisponibilidadRecord } from './formats/disponibilidad-record.entity';
import { HorasExtraRecord } from './formats/horas-extra-record.entity';
import { Schedule } from './schedules/schedule.entity';
import { ScheduleDay } from './schedules/schedule-day.entity';
import { EvidenceFile } from './evidences/evidence-file.entity';
import { DriveFolderCache } from './evidences/drive-folder-cache.entity';

// Dependencias externas
import { Field } from '../plants/fields/entities/field.entity';
import { Employee } from '../plants/employees/entities/employee.entity';

// Services y Controllers
import { DeliverablesService } from './deliverables/deliverables.service';
import { DeliverablesController } from './deliverables/deliverables.controller';
import { FormatsService } from './formats/formats.service';
import { FormatsController } from './formats/formats.controller';
import { SchedulesService } from './schedules/schedules.service';
import { SchedulesController } from './schedules/schedules.controller';
import { EvidencesService } from './evidences/evidences.service';
import { EvidencesController } from './evidences/evidences.controller';

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
