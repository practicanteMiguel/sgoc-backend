import { IsString, IsDateString, IsOptional, IsUUID } from 'class-validator';

export class CreateActivityDto {
  @IsString()
  description!: string;

  @IsDateString()
  start_date!: string;

  @IsDateString()
  end_date!: string;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsUUID()
  @IsOptional()
  vault_before?: string;

  @IsUUID()
  @IsOptional()
  vault_during?: string;

  @IsUUID()
  @IsOptional()
  vault_after?: string;
}
