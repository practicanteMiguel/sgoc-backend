import { IsUUID, IsString, IsOptional, IsBoolean } from 'class-validator';

export class CreateReportDto {
  @IsUUID()
  activity_id!: string;

  @IsString()
  @IsOptional()
  additional_resource?: string;

  @IsString()
  @IsOptional()
  requirement?: string;

  @IsString()
  @IsOptional()
  progress?: string;

  @IsBoolean()
  @IsOptional()
  is_scheduled?: boolean;
}
