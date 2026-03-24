import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification } from './entities/notification.entity';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Notification)
    private notifRepo: Repository<Notification>,
  ) {}

  findByUser(userId: string) {
    return this.notifRepo.find({
      where: { user: { id: userId } },
      order: { created_at: 'DESC' },
      take: 50,
    });
  }

  async markAsRead(id: string, userId: string) {
    const notif = await this.notifRepo.findOne({
      where: { id, user: { id: userId } },
    });
    if (!notif) throw new NotFoundException('Notificación no encontrada');
    notif.is_read = true;
    notif.read_at = new Date();
    return this.notifRepo.save(notif);
  }

  markAllAsRead(userId: string) {
    return this.notifRepo.update(
      { user: { id: userId }, is_read: false },
      { is_read: true, read_at: new Date() },
    );
  }

  // Método para que otros servicios puedan crear notificaciones
  create(payload: {
    user_id: string;
    type: string;
    title: string;
    message: string;
    data?: Record<string, any>;
    created_by_id?: string;
  }) {
    return this.notifRepo.save({
      user: { id: payload.user_id },
      type: payload.type,
      title: payload.title,
      message: payload.message,
      data: payload.data,
      created_by: payload.created_by_id ? { id: payload.created_by_id } : undefined,
    });
  }
}