import {
  IsString, IsBoolean, IsOptional,
  IsNumber, IsArray, IsEnum,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { ScheduleType } from '../entities/employee.entity';

export class UpdateEmployeeDto {
  @ApiPropertyOptional()
  @IsOptional() @IsString()
  first_name?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  last_name?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  position?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsBoolean()
  aux_trans?: boolean;

  @ApiPropertyOptional()
  @IsOptional() @IsBoolean()
  aux_hab?: boolean;

  @ApiPropertyOptional()
  @IsOptional() @IsBoolean()
  aux_ali?: boolean;

  @ApiPropertyOptional()
  @IsOptional() @IsNumber()
  salario_base?: number;

  @ApiPropertyOptional({ enum: ScheduleType, isArray: true })
  @IsOptional()
  @IsArray()
  @IsEnum(ScheduleType, { each: true })
  schedules?: ScheduleType[];
}
