import { IsArray, IsOptional, IsString, IsUUID } from 'class-validator';

export class GenerateReportDto {
  @IsArray()
  @IsUUID('4', { each: true })
  ids!: string[];

  @IsOptional()
  @IsString()
  title?: string;
}
