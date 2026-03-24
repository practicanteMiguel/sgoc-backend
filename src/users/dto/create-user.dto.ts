import { IsEmail, IsString, IsNotEmpty, IsOptional, IsIn } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateUserDto {
  @ApiProperty({ example: 'juan@empresa.com' })
  @IsEmail({}, { message: 'Email inválido' })
  email!: string;

  @ApiProperty()
  @IsString() @IsNotEmpty()
  first_name!: string;

  @ApiProperty()
  @IsString() @IsNotEmpty()
  last_name!: string;

  @ApiProperty()
  @IsString() @IsNotEmpty()
  position!: string;

  @ApiProperty({ enum: ['admin', 'coordinator', 'module_manager', 'supervisor'] })
  @IsIn(['admin', 'coordinator', 'module_manager', 'supervisor'])
  role_slug!: string;

  @ApiPropertyOptional({ description: 'Si no se envía se genera automáticamente' })
  @IsOptional() @IsString()
  temp_password?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  phone?: string;

  @ApiPropertyOptional({ description: 'Obligatorio para module_manager' })
  @IsOptional() @IsString()
  module?: string;

  @ApiPropertyOptional({ description: 'Obligatorio para supervisor' })
  @IsOptional() @IsString()
  field?: string;
}