import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, Query, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { NotificationsService } from './notifications.service';
import { SendNotificationDto } from './dto/send-notification.dto';
import { User } from '../users/entities/user.entity';

@ApiTags('Notifications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notifService: NotificationsService) {}

 
  @Post('send')
  @ApiOperation({ summary: 'Enviar mensaje/notificación a un usuario' })
  send(@Body() dto: SendNotificationDto, @CurrentUser() user: User) {
    return this.notifService.send(dto, user);
  }

  
  @Get()
  @ApiOperation({ summary: 'Ver mis notificaciones (solo las propias)' })
  @ApiQuery({ name: 'unread', required: false, type: Boolean, description: 'Solo no leídas' })
  findMine(
    @CurrentUser('id') userId: string,
    @Query('unread') unread?: string,
  ) {
    return this.notifService.findMyNotifications(userId, unread === 'true');
  }


  @Get('unread-count')
  @ApiOperation({ summary: 'Cantidad de notificaciones no leídas' })
  countUnread(@CurrentUser('id') userId: string) {
    return this.notifService.countUnread(userId);
  }


  @Patch(':id/read')
  @ApiOperation({ summary: 'Marcar una notificación como leída' })
  markRead(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.notifService.markAsRead(id, userId);
  }

 
  @Patch('read-all')
  @ApiOperation({ summary: 'Marcar todas mis notificaciones como leídas' })
  markAllRead(@CurrentUser('id') userId: string) {
    return this.notifService.markAllAsRead(userId);
  }


  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar una notificación propia' })
  remove(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.notifService.remove(id, userId);
  }
}