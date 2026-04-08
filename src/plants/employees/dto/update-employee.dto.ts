import {
  IsString, IsBoolean, IsOptional,
  IsNumber, IsArray, IsEnum, IsEmail, IsDateString,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { ScheduleType } from '../entities/employee.entity';

export class UpdateEmployeeDto {
  // ── Identificación ────────────────────────────────────────────
  @ApiPropertyOptional()
  @IsOptional() @IsString()
  lugar_expedicion?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsDateString()
  fecha_expedicion_cedula?: string;

  // ── Datos personales ──────────────────────────────────────────
  @ApiPropertyOptional()
  @IsOptional() @IsString()
  first_name?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  last_name?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  lugar_nacimiento?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsDateString()
  fecha_nacimiento?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  estado_civil?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  celular?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  direccion?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsEmail()
  correo_electronico?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  formacion?: string;

  // ── Datos laborales ───────────────────────────────────────────
  @ApiPropertyOptional()
  @IsOptional() @IsString()
  position?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  codigo_vacante?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsDateString()
  fecha_inicio_contrato?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsDateString()
  fecha_retiro_contrato?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  numero_prorroga?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  numero_otro_si?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  convenio?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  vigencia?: string;

  // ── Auxilios ──────────────────────────────────────────────────
  @ApiPropertyOptional()
  @IsOptional() @IsBoolean()
  aux_trans?: boolean;

  @ApiPropertyOptional()
  @IsOptional() @IsBoolean()
  aux_hab?: boolean;

  @ApiPropertyOptional()
  @IsOptional() @IsBoolean()
  aux_ali?: boolean;

  // ── Datos financieros ─────────────────────────────────────────
  @ApiPropertyOptional()
  @IsOptional() @IsNumber()
  salario_base?: number;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  eps?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  afp?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  banco?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  tipo_cuenta?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  numero_cuenta?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  afiliacion_sindicato?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  inclusion?: string;
  
  @ApiPropertyOptional()
  @IsOptional() @IsBoolean()
  is_active?: boolean;

  // ── Certificado de residencia ─────────────────────────────────
  @ApiPropertyOptional()
  @IsOptional() @IsString()
  lugar_exp_certificado_residencia?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsDateString()
  fecha_exp_certificado_residencia?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsDateString()
  vencimiento_certificado_residencia?: string;

  // ── Horario ───────────────────────────────────────────────────
  @ApiPropertyOptional({ enum: ScheduleType, isArray: true })
  @IsOptional()
  @IsArray()
  @IsEnum(ScheduleType, { each: true })
  schedules?: ScheduleType[];
}
