import { IsDateString, IsString, IsUUID, IsOptional, IsEnum, IsNumber, IsArray, ValidateNested, ArrayMinSize } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { EstadoSolicitudDotacion } from '../entities/solicitud-dotacion.entity';

export class UpdateEstadoDotacionDto {
  @ApiProperty({ enum: EstadoSolicitudDotacion })
  @IsEnum(EstadoSolicitudDotacion)
  estado!: EstadoSolicitudDotacion;
}

export class FirmaAutorizadorDto {
  @ApiProperty()
  @IsString()
  nombre_autorizador!: string;

  @ApiProperty()
  @IsString()
  cargo_autorizador!: string;
}

export class ItemRqDotacionDto {
  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  codigo?: string;

  @ApiProperty()
  @IsString()
  descripcion!: string;

  @ApiProperty()
  @IsString()
  unidad!: string;

  @ApiProperty({ enum: ['ORDINARIA', 'EXTRAORDINARIA'] })
  @IsEnum(['ORDINARIA', 'EXTRAORDINARIA'])
  tipo_requisicion!: 'ORDINARIA' | 'EXTRAORDINARIA';

  @ApiProperty({ required: false })
  @IsNumber()
  @IsOptional()
  valor_unitario?: number;

  @ApiProperty()
  @IsNumber()
  solicitado!: number;
}

export class CreateRqDesdeDotacionDto {
  @ApiProperty()
  @IsNumber()
  numero_rq!: number;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  observaciones?: string;

  @ApiProperty({ required: false })
  @IsDateString()
  @IsOptional()
  fecha?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  nombre_solicitante?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  numero_contrato?: string;

  // El front puede enviar este campo pero el estado siempre lo controla el backend
  @IsString()
  @IsOptional()
  estado?: string;

  @ApiProperty({ type: [ItemRqDotacionDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ItemRqDotacionDto)
  items!: ItemRqDotacionDto[];
}

export class CreateReposicionDto {
  @IsUUID()
  empleado_id!: string;

  @IsString()
  condicion_encontrada!: string;

  @IsOptional()
  @IsDateString()
  fecha_entrega?: string;
}

// Usado por el servicio internamente tras parsear el multipart
export class CreateSolicitudDotacionDto {
  contrato!: string;
  fecha!: string;
  inspeccion_realizada_por!: string;
  cargo_inspector!: string;
  reposiciones!: CreateReposicionDto[];
}

// Lo que llega en el body multipart
export class CreateSolicitudMultipartDto {
  @ApiProperty()
  @IsString()
  contrato!: string;

  @ApiProperty({ example: '2026-06-01' })
  @IsString()
  fecha!: string;

  @ApiProperty()
  @IsString()
  inspeccion_realizada_por!: string;

  @ApiProperty()
  @IsString()
  cargo_inspector!: string;

  @ApiProperty({
    description: 'JSON string del array de reposiciones. Ejemplo: [{"empleado_id":"uuid","condicion_encontrada":"..."}]',
  })
  @IsString()
  reposiciones!: string;
}
