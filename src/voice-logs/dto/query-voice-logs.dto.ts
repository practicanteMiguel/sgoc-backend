import { IsDateString, IsOptional, IsUUID } from 'class-validator';

export class QueryVoiceLogsDto {
  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;

  // solo usado por admin para filtrar por usuario
  @IsOptional()
  @IsUUID()
  user_id?: string;
}
