import { IsArray, IsDateString, IsEnum, IsUUID, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { Turno } from '../entities/schedule-day.entity';

export class ScheduleDayRowDto {
  @IsUUID()
  employee_id!: string;

  @IsDateString()
  fecha!: string;

  @IsEnum(Turno)
  turno!: Turno;
}

export class UpsertScheduleDaysDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ScheduleDayRowDto)
  days!: ScheduleDayRowDto[];
}
