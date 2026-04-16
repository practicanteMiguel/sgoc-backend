import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Crew } from './entities/crew.entity';
import { Field } from '../../fields/entities/field.entity';
import { Employee } from '../../employees/entities/employee.entity';
import { CrewsService } from './crews.service';
import { CrewsController } from './crews.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Crew, Field, Employee])],
  controllers: [CrewsController],
  providers: [CrewsService],
  exports: [CrewsService, TypeOrmModule],
})
export class CrewsModule {}
