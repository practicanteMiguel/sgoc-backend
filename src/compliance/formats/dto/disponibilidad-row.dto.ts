import {
  IsUUID, IsDateString, IsNumber, IsPositive,
  IsOptional, IsString,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ValidateNested, IsArray } from 'class-validator';

export class DisponibilidadRowDto {
  @IsUUID()
  employee_id!: string;

  @IsDateString()
  fecha_inicio!: string;

  @IsDateString()
  fecha_final!: string;

  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  valor_total!: number;

  @IsOptional()
  @IsString()
  descripcion?: string;

  @IsOptional()
  @IsString()
  quien_reporta?: string;
}

export class BulkDisponibilidadDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DisponibilidadRowDto)
  rows!: DisponibilidadRowDto[];
}
