import { Module } from '@nestjs/common';
import { FieldsModule } from './fields/fields.module';
import { EmployeesModule } from './employees/employees.module';
import { ActivitiesModule } from './activities/activities.module';
import { ViasModule } from './vias/vias.module';
import { DotacionesModule } from './dotaciones/dotaciones.module';
import { IndumentariaModule } from './indumentaria/indumentaria.module';

@Module({
  imports: [FieldsModule, EmployeesModule, ActivitiesModule, ViasModule, DotacionesModule, IndumentariaModule],
  exports: [FieldsModule, EmployeesModule, ActivitiesModule, ViasModule, DotacionesModule, IndumentariaModule],
})
export class PlantsModule {}
