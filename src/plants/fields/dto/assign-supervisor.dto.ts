import { IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AssignSupervisorDto {
  @ApiProperty({ description: 'UUID del usuario con rol supervisor' })
  @IsUUID()
  user_id!: string;
}
