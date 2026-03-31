import {
  Injectable, NotFoundException, BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification } from './entities/notification.entity';
import { NotificationPriority } from './entities/enum/notification-priority.enum';
import { NotificationType } from './entities/enum/notification-type.enum';
import { User } from '../users/entities/user.entity';
import { SendNotificationDto } from './dto/send-notification.dto';
import { NotificationsGateway } from './notifications.gateway';
import { title } from 'process';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Notification)
    private notifRepo: Repository<Notification>,
    @InjectRepository(User)
    private userRepo: Repository<User>,
    private gateway: NotificationsGateway,
  ) {}


  async send(dto: SendNotificationDto, sender: User): Promise<Notification> {
   
    if (dto.recipient_id === sender.id) {
      throw new BadRequestException('No podés enviarte un mensaje a vos mismo');
    }


    const recipient = await this.userRepo.findOne({
      where: { id: dto.recipient_id, is_active: true },
    });
    if (!recipient) {
      throw new NotFoundException('Usuario destinatario no encontrado');
    }

    const notif = this.notifRepo.create({
      type:     NotificationType.MESSAGE,
      priority: dto.priority,
      title:    dto.title,
      message:  dto.message,
      is_read:  false,
    });
    notif.user   = recipient;
    notif.sender = sender;

    const saved = await this.notifRepo.save(notif);

    this.gateway.sendToUser(recipient.id, {
      id: saved.id,
      title: saved.title,
      message: saved.message,
      priority: saved.priority,
      is_read: false,
      sender: {
        id: sender.id,
        first_name: sender.first_name,
        last_name: sender.last_name,
      },
    });


  
    return this.notifRepo.findOne({
      where:     { id: saved.id },
      relations: ['user', 'sender'],
    }) as Promise<Notification>;
  }

 
  async findMyNotifications(
    userId: string,
    onlyUnread = false,
  ) {
    const qb = this.notifRepo
      .createQueryBuilder('n')
      .leftJoinAndSelect('n.sender', 'sender')
      .where('n.user_id = :userId', { userId })
      .orderBy('n.created_at', 'DESC')
      .take(50);

    if (onlyUnread) {
      qb.andWhere('n.is_read = false');
    }

    const [notifications, total] = await qb.getManyAndCount();
    const unread = notifications.filter((n) => !n.is_read).length;

    return {
      data: notifications.map((n) => ({
        id:         n.id,
        type:       n.type,
        priority:   n.priority,
        title:      n.title,
        message:    n.message,
        is_read:    n.is_read,
        read_at:    n.read_at,
        created_at: n.created_at,
        sender: n.sender ? {
          id:         n.sender.id,
          first_name: n.sender.first_name,
          last_name:  n.sender.last_name,
          position:   n.sender.position,
        } : null,
      })),
      total,
      unread,
    };
  }

 
  async countUnread(userId: string): Promise<{ count: number }> {
    const count = await this.notifRepo.count({
      where: { user: { id: userId }, is_read: false },
    });
    return { count };
  }

  
  async markAsRead(id: string, userId: string) {
    const notif = await this.notifRepo.findOne({
      where: { id, user: { id: userId } },
    });
    if (!notif) {
      throw new NotFoundException('Notificación no encontrada');
    }
    if (notif.is_read) {
      return { message: 'Ya estaba marcada como leída' };
    }
    await this.notifRepo.update(id, {
      is_read: true,
      read_at: new Date(),
    });
    return { message: 'Notificación marcada como leída' };
  }

 
  async markAllAsRead(userId: string) {
    const result = await this.notifRepo
      .createQueryBuilder()
      .update()
      .set({ is_read: true, read_at: new Date() })
      .where('user_id = :userId', { userId })
      .andWhere('is_read = false')
      .execute();

    return {
      message: `${result.affected ?? 0} notificación(es) marcada(s) como leída(s)`,
      updated: result.affected ?? 0,
    };
  }

  
  async remove(id: string, userId: string) {
    const notif = await this.notifRepo.findOne({
      where: { id, user: { id: userId } },
    });
    if (!notif) {
      throw new NotFoundException('Notificación no encontrada');
    }
    await this.notifRepo.remove(notif);
    return { message: 'Notificación eliminada' };
  }

 
  async createSystem(payload: {
    user_id:    string;
    title:      string;
    message:    string;
    priority?:  NotificationPriority;
    type?:      NotificationType;
    data?:      Record<string, any>;
  }) {
    const notif = this.notifRepo.create({
      type:     payload.type     ?? NotificationType.SYSTEM,
      priority: payload.priority ?? NotificationPriority.LOW,
      title:    payload.title,
      message:  payload.message,
      data:     payload.data,
      is_read:  false,
    });
    notif.user = { id: payload.user_id } as any;
    return this.notifRepo.save(notif);
  }
}