import { Module } from '@nestjs/common';
import { FieldsModule } from './fields/fields.module';
import { EmployeesModule } from './employees/employees.module';
import { ActivitiesModule } from './activities/activities.module';

@Module({
  imports: [FieldsModule, EmployeesModule, ActivitiesModule],
  exports: [FieldsModule, EmployeesModule, ActivitiesModule],
})
export class PlantsModule {}
