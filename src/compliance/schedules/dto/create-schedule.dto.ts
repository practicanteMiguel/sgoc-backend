import { IsEnum, IsInt, IsUUID, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ScheduleTipo } from '../entities/schedule.entity';

export class CreateScheduleDto {
  @IsUUID()
  field_id!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(12)
  mes!: number;

  @Type(() => Number)
  @IsInt()
  @Min(2024)
  anio!: number;

  @IsEnum(ScheduleTipo)
  tipo!: ScheduleTipo;
}
