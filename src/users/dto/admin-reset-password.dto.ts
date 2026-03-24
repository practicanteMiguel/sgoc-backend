import { IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AdminResetPasswordDto {
  @ApiProperty({ minLength: 8, description: 'Nueva contraseña — se enviará al usuario por correo' })
  @IsString() @MinLength(8, { message: 'Mínimo 8 caracteres' })
  new_password!: string;
}