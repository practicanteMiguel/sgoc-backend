import {
  IsUUID, IsDateString, IsNumber, IsOptional,
  IsString, Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ValidateNested, IsArray } from 'class-validator';

export class HorasExtraRowDto {
  @IsUUID()
  employee_id!: string;

  @IsDateString()
  fecha_reporte!: string;

  // HH:MM format
  @IsOptional()
  @IsString()
  entrada?: string;

  @IsOptional()
  @IsString()
  salida?: string;

  @Type(() => Number) @IsNumber() @Min(0) hed!: number;
  @Type(() => Number) @IsNumber() @Min(0) hen!: number;
  @Type(() => Number) @IsNumber() @Min(0) hfd!: number;
  @Type(() => Number) @IsNumber() @Min(0) hefd!: number;
  @Type(() => Number) @IsNumber() @Min(0) hefn!: number;
  @Type(() => Number) @IsNumber() @Min(0) rn!: number;

  @IsOptional()
  @IsString()
  actividad?: string;
}

export class BulkHorasExtraDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => HorasExtraRowDto)
  rows!: HorasExtraRowDto[];
}
