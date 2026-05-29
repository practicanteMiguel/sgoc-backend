import {
  IsString, IsNotEmpty, IsEnum, IsOptional,
  IsNumber, IsInt, IsArray, ValidateNested, IsUUID, IsBoolean,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CategoriaInsumo } from '../entities/insumo.entity';
import { EstadoRequisicion } from '../entities/requisicion.entity';

export class CreateRequisicionDto {
  @ApiProperty()
  @IsInt()
  numero_rq!: number;

  @ApiPropertyOptional({ default: 45 })
  @IsOptional() @IsInt()
  lote?: number;

  @ApiProperty({ enum: CategoriaInsumo })
  @IsEnum(CategoriaInsumo)
  categoria!: CategoriaInsumo;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  lugar?: string;
}

export class UpdateRequisicionDto {
  @ApiPropertyOptional()
  @IsOptional() @IsInt()
  numero_rq?: number;

  @ApiPropertyOptional()
  @IsOptional() @IsInt()
  lote?: number;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  lugar?: string;
}

export class ItemSolicitadoDto {
  @ApiProperty()
  @IsUUID()
  id!: string;

  @ApiProperty()
  @IsNumber()
  solicitado!: number;
}

export class CreateRequisicionMasivoDto {
  @ApiProperty()
  @IsInt()
  numero_rq!: number;

  @ApiPropertyOptional({ default: 45 })
  @IsOptional() @IsInt()
  lote?: number;

  @ApiProperty({ enum: CategoriaInsumo })
  @IsEnum(CategoriaInsumo)
  categoria!: CategoriaInsumo;
}

export class UpdateEstadoDto {
  @ApiProperty({ enum: [EstadoRequisicion.PEDIDO_REALIZADO, EstadoRequisicion.EN_BODEGA, EstadoRequisicion.ENTREGADO] })
  @IsEnum(EstadoRequisicion)
  estado!: EstadoRequisicion;
}

export class ItemFacturaDto {
  @ApiProperty()
  @IsUUID()
  id!: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  numero_factura?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsNumber()
  precio_real?: number;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  proveedor_factura?: string | null;

  @ApiPropertyOptional()
  @IsOptional() @IsBoolean()
  es_adicional?: boolean;
}

export class UpdateFacturasDto {
  @ApiProperty({ type: [ItemFacturaDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ItemFacturaDto)
  items!: ItemFacturaDto[];
}

export class ItemRecepcionDto {
  @ApiProperty()
  @IsUUID()
  id!: string;

  @ApiProperty()
  @IsNumber()
  recibido!: number;

  @ApiPropertyOptional()
  @IsOptional() @IsBoolean()
  es_adicional?: boolean;
}

export class RecepcionDto {
  @ApiProperty({ example: '2026-05-26' })
  @IsString() @IsNotEmpty()
  fecha_entrega!: string;

  @ApiProperty({ type: [ItemRecepcionDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ItemRecepcionDto)
  items!: ItemRecepcionDto[];
}

export class LlenadoSupervisorDto {
  @ApiProperty()
  @IsString() @IsNotEmpty()
  fecha!: string;

  @ApiProperty()
  @IsString() @IsNotEmpty()
  nombre_solicitante!: string;

  @ApiProperty()
  @IsString() @IsNotEmpty()
  numero_contrato!: string;

  @ApiProperty({ type: [ItemSolicitadoDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ItemSolicitadoDto)
  items!: ItemSolicitadoDto[];
}
