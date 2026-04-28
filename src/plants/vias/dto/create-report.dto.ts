import {
  IsUUID, IsString, IsOptional, IsIn,
  IsArray, ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateReportItemDto {
  @IsUUID()
  @IsOptional()
  capture_group_id?: string;

  @IsString()
  via_name!: string;

  @IsIn(['bueno', 'regular', 'malo', 'critico'])
  state!: string;

  @IsString()
  @IsOptional()
  observations?: string;
}

export class CreateReportDto {
  @IsUUID()
  monthly_log_id!: string;

  @IsIn(['mensual', 'urgente'])
  type!: string;

  @IsString()
  @IsOptional()
  general_observations?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateReportItemDto)
  items!: CreateReportItemDto[];
}
