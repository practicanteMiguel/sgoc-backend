import {
  IsString,
  IsOptional,
  IsNumber,
  IsBoolean,
  IsUUID,
  IsEnum,
  IsDateString,
  IsInt,
  Min,
} from 'class-validator';
import { PartialType } from '@nestjs/mapped-types';
import { TipoEntrega } from '../entities/entrega-indumentaria.entity';

export class CreateIndumentariaDto {
  @IsString()
  nombre!: string;

  @IsOptional()
  @IsNumber()
  valor_unitario?: number | null;

  @IsOptional()
  @IsString()
  proveedor?: string | null;

  @IsOptional()
  @IsString()
  unidad?: string;

  @IsOptional()
  @IsBoolean()
  requiere_talla?: boolean;
}

export class UpdateIndumentariaDto extends PartialType(CreateIndumentariaDto) {
  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}

export class CreateEntregaDto {
  @IsUUID()
  empleado_id!: string;

  @IsUUID()
  indumentaria_id!: string;

  @IsEnum(TipoEntrega)
  tipo!: TipoEntrega;

  @IsOptional()
  @IsInt()
  @Min(1)
  cantidad?: number;

  @IsDateString()
  fecha_entrega!: string;

  @IsOptional()
  @IsString()
  observacion?: string | null;

  @IsOptional()
  @IsDateString()
  fecha_autorizacion?: string | null;

  @IsOptional()
  @IsDateString()
  fecha_solicitud_compras?: string | null;

  @IsOptional()
  @IsString()
  numero_rq?: string | null;

  @IsOptional()
  @IsUUID()
  registrado_por_id?: string | null;
}

export class UpsertTallaDto {
  @IsOptional()
  @IsString()
  talla?: string | null;
}

export class RegistrarEntregaBatchDto {
  @IsUUID()
  empleado_id!: string;

  @IsEnum(TipoEntrega)
  tipo!: TipoEntrega;

  @IsDateString()
  fecha_entrega!: string;

  @IsOptional()
  @IsString()
  numero_rq?: string | null;

  @IsOptional()
  @IsString()
  observacion?: string | null;

  @IsString()
  items!: string;
}
