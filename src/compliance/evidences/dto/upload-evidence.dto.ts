import { IsUUID, IsInt, Min, Max, IsOptional, IsEnum } from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { EvidenceCategory } from '../evidence-file.entity';

const toNumberOrUndefined = ({ value }: { value: any }) =>
  value === '' || value === null || value === undefined ? undefined : Number(value);

const toEnumOrUndefined = ({ value }: { value: any }) =>
  value === '' || value === null || value === undefined ? undefined : value;

export class UploadEvidenceDto {
  @ApiProperty({ example: 'uuid-de-la-planta' })
  @IsUUID()
  field_id!: string;

  @ApiPropertyOptional({ example: 2026 })
  @IsOptional()
  @Transform(toNumberOrUndefined)
  @IsInt()
  @Min(2020)
  anio?: number;

  @ApiPropertyOptional({ example: 4, description: '1-12. Requiere anio.' })
  @IsOptional()
  @Transform(toNumberOrUndefined)
  @IsInt()
  @Min(1)
  @Max(12)
  mes?: number;

  @ApiPropertyOptional({ enum: EvidenceCategory, description: 'Requiere mes.' })
  @IsOptional()
  @Transform(toEnumOrUndefined)
  @IsEnum(EvidenceCategory)
  category?: EvidenceCategory;
}
