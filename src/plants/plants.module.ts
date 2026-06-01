import { Module } from '@nestjs/common';
import { FieldsModule } from './fields/fields.module';
import { EmployeesModule } from './employees/employees.module';
import { ActivitiesModule } from './activities/activities.module';
import { ViasModule } from './vias/vias.module';
import { DotacionesModule } from './dotaciones/dotaciones.module';

@Module({
  imports: [FieldsModule, EmployeesModule, ActivitiesModule, ViasModule, DotacionesModule],
  exports: [FieldsModule, EmployeesModule, ActivitiesModule, ViasModule, DotacionesModule],
})
export class PlantsModule {}
