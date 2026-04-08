import {
  IsString, IsNotEmpty, IsBoolean, IsOptional,
  IsNumber, IsArray, IsEnum, IsUUID, IsEmail, IsDateString,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ScheduleType } from '../entities/employee.entity';

export class CreateEmployeeDto {
  // ── Identificación ────────────────────────────────────────────
  @ApiProperty({ example: '1234567890' })
  @IsString() @IsNotEmpty()
  identification_number!: string;

  @ApiPropertyOptional({ example: 'Neiva' })
  @IsOptional() @IsString()
  lugar_expedicion?: string;

  @ApiPropertyOptional({ example: '2005-03-15' })
  @IsOptional() @IsDateString()
  fecha_expedicion_cedula?: string;

  // ── Datos personales ──────────────────────────────────────────
  @ApiProperty()
  @IsString() @IsNotEmpty()
  first_name!: string;

  @ApiProperty()
  @IsString() @IsNotEmpty()
  last_name!: string;

  @ApiPropertyOptional({ example: 'Neiva' })
  @IsOptional() @IsString()
  lugar_nacimiento?: string;

  @ApiPropertyOptional({ example: '1985-06-20' })
  @IsOptional() @IsDateString()
  fecha_nacimiento?: string;

  @ApiPropertyOptional({ example: 'Soltero' })
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

  @ApiPropertyOptional({ example: 'Bachiller' })
  @IsOptional() @IsString()
  formacion?: string;

  // ── Datos laborales ───────────────────────────────────────────
  @ApiProperty({ example: 'Operario' })
  @IsString() @IsNotEmpty()
  position!: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  codigo_vacante?: string;

  @ApiPropertyOptional({ example: '2023-01-01' })
  @IsOptional() @IsDateString()
  fecha_inicio_contrato?: string;

  @ApiPropertyOptional({ example: '2024-12-31' })
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
  @ApiPropertyOptional({ default: false })
  @IsOptional() @IsBoolean()
  aux_trans?: boolean;

  @ApiPropertyOptional({ default: false })
  @IsOptional() @IsBoolean()
  aux_hab?: boolean;

  @ApiPropertyOptional({ default: false })
  @IsOptional() @IsBoolean()
  aux_ali?: boolean;

  // ── Datos financieros ─────────────────────────────────────────
  @ApiProperty({ example: 1500000 })
  @IsNumber()
  salario_base!: number;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  eps?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  afp?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  banco?: string;

  @ApiPropertyOptional({ example: 'Ahorros' })
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

  // ── Certificado de residencia ─────────────────────────────────
  @ApiPropertyOptional()
  @IsOptional() @IsString()
  lugar_exp_certificado_residencia?: string;

  @ApiPropertyOptional({ example: '2024-01-10' })
  @IsOptional() @IsDateString()
  fecha_exp_certificado_residencia?: string;

  @ApiPropertyOptional({ example: '2025-01-10' })
  @IsOptional() @IsDateString()
  vencimiento_certificado_residencia?: string;

  // ── Horario y planta ──────────────────────────────────────────
  @ApiProperty({ enum: ScheduleType, isArray: true, example: ['6x6'] })
  @IsArray()
  @IsEnum(ScheduleType, { each: true })
  schedules!: ScheduleType[];

  @ApiPropertyOptional({ description: 'UUID de la planta a asignar al crear' })
  @IsOptional() @IsUUID()
  field_id?: string;
}
