import { Module } from '@nestjs/common';
import { FieldsModule } from './fields/fields.module';
import { EmployeesModule } from './employees/employees.module';
import { ActivitiesModule } from './activities/activities.module';
import { ViasModule } from './vias/vias.module';

@Module({
  imports: [FieldsModule, EmployeesModule, ActivitiesModule, ViasModule],
  exports: [FieldsModule, EmployeesModule, ActivitiesModule, ViasModule],
})
export class PlantsModule {}
