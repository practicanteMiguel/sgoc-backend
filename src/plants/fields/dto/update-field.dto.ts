import { IsString, IsOptional, IsNumber, ValidateIf } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class UpdateFieldDto {
  @ApiPropertyOptional()
  @IsOptional() @IsString()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  location?: string;

  @ApiPropertyOptional()
  @IsOptional() @Type(() => Number) @IsNumber()
  center_lat?: number;

  @ApiPropertyOptional()
  @IsOptional() @Type(() => Number) @IsNumber()
  center_lng?: number;
}

export class SetPresupuestoDto {
  @ApiProperty({ nullable: true, type: Number })
  @ValidateIf((o) => o.presupuesto !== null)
  @IsNumber()
  presupuesto!: number | null;
}
