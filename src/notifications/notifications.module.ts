import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Notification } from './entities/notification.entity';
import { PushSubscription } from './entities/push-subscription.entity';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { User } from '../users/entities/user.entity';
import { NotificationsGateway } from './notifications.gateway';
import { JwtService } from '@nestjs/jwt';

@Module({
  imports: [TypeOrmModule.forFeature([Notification, PushSubscription, User])],
  controllers: [NotificationsController],
  providers: [NotificationsService, NotificationsGateway, JwtService],
  exports: [NotificationsService, NotificationsGateway],
})
export class NotificationsModule {}