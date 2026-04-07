import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateFieldDto {
  @ApiProperty({ example: 'Planta Norte' })
  @IsString() @IsNotEmpty()
  name!: string;

  @ApiProperty({ example: 'Km 12 vía Bogotá' })
  @IsString() @IsNotEmpty()
  location!: string;
}
