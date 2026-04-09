import { IsInt, IsUUID, IsDateString, IsOptional, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class GenerateMonthDto {
  @IsUUID()
  field_id!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(12)
  mes!: number;

  @Type(() => Number)
  @IsInt()
  @Min(2024)
  anio!: number;

  // Fecha limite de entrega. Si no se provee se usa el ultimo dia del mes.
  @IsOptional()
  @IsDateString()
  due_date?: string;
}
