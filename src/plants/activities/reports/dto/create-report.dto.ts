import {
  IsUUID, IsString, IsOptional, IsBoolean,
  IsArray, ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class ReportActivityDto {
  @IsUUID()
  activity_id!: string;

  @IsString()
  @IsOptional()
  requirement?: string;

  @IsString()
  @IsOptional()
  additional_resource?: string;

  @IsString()
  @IsOptional()
  progress?: string;

  @IsBoolean()
  @IsOptional()
  is_scheduled?: boolean;
}

export class CreateReportDto {
  @IsUUID()
  log_id!: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReportActivityDto)
  activities!: ReportActivityDto[];
}
