import { IsString, IsDateString, IsOptional } from 'class-validator';

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
}
