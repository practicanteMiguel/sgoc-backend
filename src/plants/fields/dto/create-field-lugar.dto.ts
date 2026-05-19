import { IsString, IsNotEmpty, IsOptional, IsNumber, ValidateIf } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateFieldLugarDto {
  @ApiProperty({ example: 'Invernadero Norte' })
  @IsString() @IsNotEmpty()
  nombre!: string;

  @ApiPropertyOptional({ nullable: true, type: Number })
  @IsOptional()
  @ValidateIf((o) => o.presupuesto !== null)
  @IsNumber()
  presupuesto?: number | null;
}
