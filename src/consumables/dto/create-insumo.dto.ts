import { IsString, IsNotEmpty, IsEnum, IsOptional, IsNumber, IsBoolean, IsInt, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CategoriaInsumo } from '../entities/insumo.entity';
export { CategoriaInsumo };

export class CreateInsumoDto {
  @ApiProperty()
  @IsString() @IsNotEmpty()
  descripcion!: string;

  @ApiProperty()
  @IsString() @IsNotEmpty()
  unidad!: string;

  @ApiPropertyOptional()
  @IsOptional() @IsNumber()
  valor_unitario?: number;

  @ApiProperty({ enum: CategoriaInsumo })
  @IsEnum(CategoriaInsumo)
  categoria!: CategoriaInsumo;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  proveedor_ordinario?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  proveedor_extraordinario?: string;
}

export class CerrarMesDto {
  @ApiProperty({ example: 5 })
  @IsInt() @Min(1) @Max(12)
  mes!: number;

  @ApiProperty({ example: 2026 })
  @IsInt() @Min(2024)
  anio!: number;
}

export class BorradorInsumoDto {
  @ApiProperty({ example: 5 })
  @IsInt() @Min(1) @Max(12)
  mes!: number;

  @ApiProperty({ example: 2026 })
  @IsInt() @Min(2024)
  anio!: number;

  @ApiPropertyOptional()
  @IsOptional() @IsNumber()
  valor_unitario?: number;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  proveedor_ordinario?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  proveedor_extraordinario?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsBoolean()
  activo?: boolean;
}

export class UpdateInsumoDto {
  @ApiPropertyOptional()
  @IsOptional() @IsNumber()
  valor_unitario?: number;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  proveedor_ordinario?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  proveedor_extraordinario?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsBoolean()
  activo?: boolean;
}
