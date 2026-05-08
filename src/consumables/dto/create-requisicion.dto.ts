import {
  IsString, IsNotEmpty, IsEnum, IsOptional,
  IsNumber, IsInt, IsArray, ValidateNested, IsUUID,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CategoriaInsumo } from '../entities/insumo.entity';

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
