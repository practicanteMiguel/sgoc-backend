import { IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ReportActivityDto } from './create-report.dto';

export class UpdateReportDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReportActivityDto)
  activities!: ReportActivityDto[];
}
