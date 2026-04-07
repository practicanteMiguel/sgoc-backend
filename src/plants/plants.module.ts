import { Module } from '@nestjs/common';
import { FieldsModule } from './fields/fields.module';
import { EmployeesModule } from './employees/employees.module';

@Module({
  imports: [FieldsModule, EmployeesModule],
  exports: [FieldsModule, EmployeesModule],
})
export class PlantsModule {}
