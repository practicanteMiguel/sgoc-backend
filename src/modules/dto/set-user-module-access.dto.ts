import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray, IsBoolean, IsOptional, IsString,
  ValidateNested,
} from 'class-validator';

export class ModuleAccessItemDto {
  @ApiProperty({ example: 'vehicles', description: 'Slug del módulo' })
  @IsString()
  module_slug!: string;

  @ApiProperty({ required: false, default: false })
  @IsBoolean()
  @IsOptional()
  can_create?: boolean;

  @ApiProperty({ required: false, default: false })
  @IsBoolean()
  @IsOptional()
  can_edit?: boolean;

  @ApiProperty({ required: false, default: false })
  @IsBoolean()
  @IsOptional()
  can_delete?: boolean;

  @ApiProperty({ required: false, default: false })
  @IsBoolean()
  @IsOptional()
  can_export?: boolean;
}

export class SetUserModuleAccessDto {
  @ApiProperty({
    type: [ModuleAccessItemDto],
    description: 'Lista de módulos con permisos. Array vacío limpia los accesos del usuario.',
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ModuleAccessItemDto)
  accesses!: ModuleAccessItemDto[];
}

export class SingleModuleAccessDto {
  @ApiProperty({ required: false, default: false })
  @IsBoolean()
  @IsOptional()
  can_create?: boolean;

  @ApiProperty({ required: false, default: false })
  @IsBoolean()
  @IsOptional()
  can_edit?: boolean;

  @ApiProperty({ required: false, default: false })
  @IsBoolean()
  @IsOptional()
  can_delete?: boolean;

  @ApiProperty({ required: false, default: false })
  @IsBoolean()
  @IsOptional()
  can_export?: boolean;
}
