import { IsUUID, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateWeeklyLogDto {
  @IsUUID()
  crew_id!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(53)
  week_number!: number;

  @Type(() => Number)
  @IsInt()
  @Min(2020)
  year!: number;
}
