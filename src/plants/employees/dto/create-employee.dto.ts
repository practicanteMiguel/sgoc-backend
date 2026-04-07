import {
  IsString, IsNotEmpty, IsBoolean, IsOptional,
  IsNumber, IsArray, IsEnum, IsUUID,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ScheduleType } from '../entities/employee.entity';

export class CreateEmployeeDto {
  @ApiProperty({ example: '1234567890' })
  @IsString() @IsNotEmpty()
  identification_number!: string;

  @ApiProperty()
  @IsString() @IsNotEmpty()
  first_name!: string;

  @ApiProperty()
  @IsString() @IsNotEmpty()
  last_name!: string;

  @ApiProperty({ example: 'Operario' })
  @IsString() @IsNotEmpty()
  position!: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional() @IsBoolean()
  aux_trans?: boolean;

  @ApiPropertyOptional({ default: false })
  @IsOptional() @IsBoolean()
  aux_hab?: boolean;

  @ApiPropertyOptional({ default: false })
  @IsOptional() @IsBoolean()
  aux_ali?: boolean;

  @ApiProperty({ example: 1500000 })
  @IsNumber()
  salario_base!: number;

  @ApiProperty({ enum: ScheduleType, isArray: true, example: ['6x6'] })
  @IsArray()
  @IsEnum(ScheduleType, { each: true })
  schedules!: ScheduleType[];

  @ApiPropertyOptional({ description: 'UUID de la planta a asignar al crear' })
  @IsOptional() @IsUUID()
  field_id?: string;
}
