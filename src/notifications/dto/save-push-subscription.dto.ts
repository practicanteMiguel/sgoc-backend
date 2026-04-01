import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  ValidateNested,
} from 'class-validator';

class PushKeysDto {
  @ApiProperty({ description: 'Clave pública de cifrado (base64url)' })
  @IsString()
  @IsNotEmpty()
  p256dh!: string;

  @ApiProperty({ description: 'Secreto de autenticación (base64url)' })
  @IsString()
  @IsNotEmpty()
  auth!: string;
}

export class SavePushSubscriptionDto {
  @ApiProperty({
    description: 'Endpoint URL del servicio de push del navegador',
    example: 'https://fcm.googleapis.com/fcm/send/...',
  })
  @IsUrl()
  @IsNotEmpty()
  endpoint!: string;

  @ApiProperty({ description: 'Claves de cifrado de la suscripción' })
  @IsObject()
  @ValidateNested()
  @Type(() => PushKeysDto)
  keys!: PushKeysDto;

  @ApiPropertyOptional({
    description: 'User-Agent del navegador para identificar el dispositivo',
    maxLength: 300,
  })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  user_agent?: string;
}
