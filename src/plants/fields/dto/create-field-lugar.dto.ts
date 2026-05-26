import { IsString, IsNotEmpty, IsOptional, IsNumber, IsInt, Min, ValidateIf } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateFieldLugarDto {
  @ApiProperty({ example: 'Invernadero Norte' })
  @IsString() @IsNotEmpty()
  nombre!: string;

  @ApiPropertyOptional({ example: 45, default: 45 })
  @IsOptional()
  @IsInt()
  @Min(1)
  lote?: number;

  @ApiPropertyOptional({ nullable: true, type: Number })
  @IsOptional()
  @ValidateIf((o) => o.presupuesto !== null)
  @IsNumber()
  presupuesto?: number | null;
}
