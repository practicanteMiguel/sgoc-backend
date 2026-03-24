import { IsString, MinLength, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ChangePasswordDto {
  @ApiPropertyOptional({ description: 'No requerido en el primer login' })
  @IsOptional() @IsString()
  current_password?: string;

  @ApiProperty({ minLength: 8 })
  @IsString() @MinLength(8, { message: 'Mínimo 8 caracteres' })
  new_password!: string;
}