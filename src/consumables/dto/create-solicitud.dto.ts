import {
  IsInt, Min, Max, IsArray, ValidateNested, IsUUID, IsNumber, IsString,
  IsNotEmpty, IsEnum, IsOptional,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CategoriaInsumo } from '../entities/insumo.entity';

export class CrearSolicitudesDto {
  @ApiProperty({ example: 5 })
  @IsInt() @Min(1) @Max(12)
  mes!: number;

  @ApiProperty({ example: 2026 })
  @IsInt() @Min(2024)
  anio!: number;
}

export class CrearSolicitudAdicionalDto {
  @ApiProperty({ example: 5 })
  @IsInt() @Min(1) @Max(12)
  mes!: number;

  @ApiProperty({ example: 2026 })
  @IsInt() @Min(2024)
  anio!: number;

  @ApiPropertyOptional({ description: 'ID del lugar predefinido en la planta. Si se provee, se usa su nombre y presupuesto.' })
  @IsOptional() @IsUUID()
  field_lugar_id?: string;

  @ApiPropertyOptional({ example: 'Invernadero Norte', description: 'Requerido si no se provee field_lugar_id' })
  @IsOptional() @IsString() @IsNotEmpty()
  lugar?: string;
}

export class ItemLlenadoDto {
  @ApiProperty()
  @IsUUID()
  id!: string;

  @ApiProperty()
  @IsNumber()
  solicitado!: number;
}

export class LlenadoSolicitudDto {
  @ApiProperty()
  @IsString() @IsNotEmpty()
  fecha!: string;

  @ApiProperty()
  @IsString() @IsNotEmpty()
  nombre_solicitante!: string;

  @ApiProperty()
  @IsString() @IsNotEmpty()
  numero_contrato!: string;

  @ApiProperty({ type: [ItemLlenadoDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ItemLlenadoDto)
  items!: ItemLlenadoDto[];
}

export class AsignacionRqDto {
  @ApiProperty({ enum: CategoriaInsumo })
  @IsEnum(CategoriaInsumo)
  categoria!: CategoriaInsumo;

  @ApiProperty()
  @IsInt()
  numero_rq!: number;
}

export class CrearAdicionalDto {
  @ApiProperty({ enum: CategoriaInsumo })
  @IsEnum(CategoriaInsumo)
  categoria!: CategoriaInsumo;

  @ApiProperty()
  @IsString() @IsNotEmpty()
  descripcion!: string;

  @ApiProperty()
  @IsString() @IsNotEmpty()
  unidad!: string;

  @ApiPropertyOptional()
  @IsOptional() @IsNumber()
  valor_unitario?: number;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  proveedor?: string;

  @ApiProperty()
  @IsNumber()
  solicitado!: number;
}

export class UpdateAdicionalDto {
  @ApiPropertyOptional({ enum: CategoriaInsumo })
  @IsOptional() @IsEnum(CategoriaInsumo)
  categoria?: CategoriaInsumo;

  @ApiPropertyOptional()
  @IsOptional() @IsString() @IsNotEmpty()
  descripcion?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString() @IsNotEmpty()
  unidad?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsNumber()
  valor_unitario?: number | null;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  proveedor?: string | null;

  @ApiPropertyOptional()
  @IsOptional() @IsNumber()
  solicitado?: number;
}

export class AjusteItemDto {
  @ApiProperty()
  @IsUUID()
  item_id!: string;

  @ApiProperty()
  @IsNumber()
  solicitado_nuevo!: number;

  @ApiProperty()
  @IsNumber()
  solicitado_original!: number;
}

export class GenerarRqsDto {
  @ApiProperty()
  @IsUUID()
  solicitud_id!: string;

  @ApiProperty({ type: [AsignacionRqDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AsignacionRqDto)
  asignaciones!: AsignacionRqDto[];

  @ApiPropertyOptional({ type: [AjusteItemDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AjusteItemDto)
  ajustes?: AjusteItemDto[];
}
