import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ViaMonthlyLog } from '../entities/via-monthly-log.entity';
import { Field } from '../../fields/entities/field.entity';
import { ViaMonthlyLogService } from './via-monthly-log.service';
import { ViaMonthlyLogController } from './via-monthly-log.controller';

@Module({
  imports: [TypeOrmModule.forFeature([ViaMonthlyLog, Field])],
  controllers: [ViaMonthlyLogController],
  providers: [ViaMonthlyLogService],
  exports: [TypeOrmModule, ViaMonthlyLogService],
})
export class ViaMonthlyLogModule {}
