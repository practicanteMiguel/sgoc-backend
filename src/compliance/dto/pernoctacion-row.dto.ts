import { IsUUID, IsDateString, IsNumber, IsPositive } from 'class-validator';
import { Type } from 'class-transformer';
import { ValidateNested, IsArray } from 'class-validator';

export class PernoctacionRowDto {
  @IsUUID()
  employee_id!: string;

  @IsDateString()
  fecha!: string;

  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  vr_dia!: number;
}

export class BulkPernoctacionDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PernoctacionRowDto)
  rows!: PernoctacionRowDto[];
}
