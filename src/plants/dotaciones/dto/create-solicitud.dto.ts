import { IsDateString, IsString, IsUUID, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { EstadoSolicitudDotacion } from '../entities/solicitud-dotacion.entity';

export class UpdateEstadoDto {
  @ApiProperty({ enum: EstadoSolicitudDotacion })
  @IsEnum(EstadoSolicitudDotacion)
  estado!: EstadoSolicitudDotacion;
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
