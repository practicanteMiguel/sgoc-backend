import { IsUUID, IsDateString, IsString, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';
import { ValidateNested, IsArray } from 'class-validator';

export class TaxiRowDto {
  @IsUUID()
  employee_id!: string;

  @IsDateString()
  fecha!: string;

  @IsString()
  desde!: string;

  @IsString()
  hasta!: string;

  @IsString()
  trayecto_taxi!: string;

  @IsOptional()
  @IsString()
  descripcion?: string;
}

export class BulkTaxiDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TaxiRowDto)
  rows!: TaxiRowDto[];
}
