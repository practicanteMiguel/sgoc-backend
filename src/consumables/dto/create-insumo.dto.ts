import { IsString, IsNotEmpty, IsEnum, IsOptional, IsNumber, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CategoriaInsumo } from '../entities/insumo.entity';

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
