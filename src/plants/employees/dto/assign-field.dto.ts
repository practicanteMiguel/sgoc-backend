import { IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AssignFieldDto {
  @ApiProperty({ description: 'UUID de la planta' })
  @IsUUID()
  field_id!: string;
}
