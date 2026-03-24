import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsUUID,
  MaxLength,
  IsOptional,
} from 'class-validator';
import { NotificationPriority } from '../entities/enum/notification-priority.enum';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SendNotificationDto {
  @ApiProperty({
    description: 'ID del usuario al que se le envía la notificación',
    example: 'b8c9b7d5-7b3d-4b3d-9b3d-b3d7b3d7b3d7',
  })
  @IsUUID('4', {
    message: 'El ID del usuario debe ser un UUID valido',
  })
    recipient_id!: string;

    @ApiProperty({
    description: 'Título de la notificación',
        example: 'Notificación de prueba',
        maxLength: 50,
    })
    @IsString() @IsNotEmpty({
      message: 'El título de la notificación es obligatorio',
    }) @MaxLength(50, {
      message: 'El título de la notificación debe tener menos de 50 caracteres',
    })
    title!: string;

    @ApiProperty({
    description: 'Mensaje de la notificación',
    example: 'Esto es una notificación de prueba',
    maxLength: 200,
    })
    @IsString() @IsNotEmpty({
      message: 'El mensaje de la notificación es obligatorio',
    }) @MaxLength(200, {
      message: 'El mensaje de la notificación debe tener menos de 200 caracteres',
    })
    message!: string;
    
    @ApiProperty({
    description: 'Nivel de prioridad del mensaje',
    enum: NotificationPriority,
    example: NotificationPriority.LOW,
    })
    @IsEnum(NotificationPriority, {
      message: 'La prioridad debe ser LOW, MEDIUM o HIGH',
    })
    priority!: NotificationPriority;
}
