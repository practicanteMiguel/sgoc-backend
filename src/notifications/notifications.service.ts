import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as webpush from 'web-push';
import { Notification } from './entities/notification.entity';
import { PushSubscription } from './entities/push-subscription.entity';
import { NotificationPriority } from './entities/enum/notification-priority.enum';
import { NotificationType } from './entities/enum/notification-type.enum';
import { User } from '../users/entities/user.entity';
import { SendNotificationDto } from './dto/send-notification.dto';
import { SavePushSubscriptionDto } from './dto/save-push-subscription.dto';
import { NotificationsGateway } from './notifications.gateway';

@Injectable()
export class NotificationsService implements OnModuleInit {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @InjectRepository(Notification)
    private notifRepo: Repository<Notification>,
    @InjectRepository(User)
    private userRepo: Repository<User>,
    @InjectRepository(PushSubscription)
    private pushSubRepo: Repository<PushSubscription>,
    private gateway: NotificationsGateway,
  ) {}

  onModuleInit() {
    const publicKey = process.env.VAPID_PUBLIC_KEY;
    const privateKey = process.env.VAPID_PRIVATE_KEY;
    const email = process.env.VAPID_EMAIL ?? 'mailto:admin@servicio.com';

    if (!publicKey || !privateKey) {
      this.logger.warn(
        'VAPID_PUBLIC_KEY o VAPID_PRIVATE_KEY no configuradas — Web Push deshabilitado',
      );
      return;
    }

    webpush.setVapidDetails(email, publicKey, privateKey);
    this.logger.log('Web Push (VAPID) inicializado correctamente');
  }

  // ── Envío de notificación ──────────────────────────────────────────────────

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
      type: NotificationType.MESSAGE,
      priority: dto.priority,
      title: dto.title,
      message: dto.message,
      is_read: false,
    });
    notif.user = recipient;
    notif.sender = sender;

    const saved = await this.notifRepo.save(notif);

    // Emitir por WebSocket (si el usuario está conectado en la app)
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

    // Web Push a todos sus dispositivos suscritos (aunque tenga la app cerrada)
    void this.sendWebPushToUser(recipient.id, {
      title: saved.title,
      body: `${sender.first_name} ${sender.last_name}: ${saved.message}`,
      data: {
        notification_id: saved.id,
        url: '/notifications',
      },
    });

    return this.notifRepo.findOne({
      where: { id: saved.id },
      relations: ['user', 'sender'],
    }) as Promise<Notification>;
  }

  // ── Web Push: suscripciones ────────────────────────────────────────────────

  async savePushSubscription(
    userId: string,
    dto: SavePushSubscriptionDto,
  ): Promise<{ message: string; id: string }> {
    // Si ya existe ese endpoint (mismo dispositivo, token rotado) → actualizar
    let sub = await this.pushSubRepo.findOne({
      where: { endpoint: dto.endpoint },
    });

    if (sub) {
      sub.p256dh = dto.keys.p256dh;
      sub.auth = dto.keys.auth;
      sub.is_active = true;
      if (dto.user_agent) sub.user_agent = dto.user_agent;
      await this.pushSubRepo.save(sub);
      return { message: 'Suscripción actualizada', id: sub.id };
    }

    sub = this.pushSubRepo.create({
      endpoint: dto.endpoint,
      p256dh: dto.keys.p256dh,
      auth: dto.keys.auth,
      user_agent: dto.user_agent ?? null,
      is_active: true,
    });
    sub.user = { id: userId } as User;
    await this.pushSubRepo.save(sub);

    return { message: 'Suscripción guardada', id: sub.id };
  }

  async removePushSubscription(
    userId: string,
    endpoint: string,
  ): Promise<{ message: string }> {
    const sub = await this.pushSubRepo.findOne({
      where: { endpoint, user: { id: userId } },
    });
    if (!sub) throw new NotFoundException('Suscripción no encontrada');
    await this.pushSubRepo.remove(sub);
    return { message: 'Suscripción eliminada' };
  }

  async getMyPushSubscriptions(userId: string) {
    const subs = await this.pushSubRepo.find({
      where: { user: { id: userId }, is_active: true },
      order: { created_at: 'DESC' },
    });
    return subs.map((s) => ({
      id: s.id,
      endpoint: s.endpoint,
      user_agent: s.user_agent,
      created_at: s.created_at,
      last_used_at: s.last_used_at,
    }));
  }

  getVapidPublicKey(): { public_key: string } {
    const key = process.env.VAPID_PUBLIC_KEY;
    if (!key) {
      throw new BadRequestException('Web Push no está configurado en el servidor');
    }
    return { public_key: key };
  }

  // ── Envío interno Web Push ─────────────────────────────────────────────────

  async sendWebPushToUser(
    userId: string,
    payload: { title: string; body: string; data?: Record<string, any> },
  ): Promise<void> {
    if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) return;

    const subs = await this.pushSubRepo.find({
      where: { user: { id: userId }, is_active: true },
    });
    if (!subs.length) return;

    const pushPayload = JSON.stringify({
      title: payload.title,
      body: payload.body,
      icon: '/icon-192x192.png',
      badge: '/badge-72x72.png',
      data: payload.data ?? {},
    });

    const results = await Promise.allSettled(
      subs.map((sub) =>
        webpush
          .sendNotification(
            {
              endpoint: sub.endpoint,
              keys: { p256dh: sub.p256dh, auth: sub.auth },
            },
            pushPayload,
          )
          .then(async () => {
            await this.pushSubRepo.update(sub.id, { last_used_at: new Date() });
          }),
      ),
    );

    // Limpiar suscripciones expiradas (el navegador ya no las acepta)
    const expiredEndpoints: string[] = [];
    results.forEach((result, i) => {
      if (result.status === 'rejected') {
        const err = result.reason as any;
        if (err?.statusCode === 410 || err?.statusCode === 404) {
          expiredEndpoints.push(subs[i].endpoint);
        } else {
          this.logger.warn(
            `Error push a userId=${userId}: ${err?.message ?? err}`,
          );
        }
      }
    });

    if (expiredEndpoints.length) {
      await this.pushSubRepo
        .createQueryBuilder()
        .update()
        .set({ is_active: false })
        .where('endpoint IN (:...endpoints)', { endpoints: expiredEndpoints })
        .execute();
      this.logger.debug(
        `${expiredEndpoints.length} suscripción(es) expirada(s) desactivada(s)`,
      );
    }
  }

  // ── Notificaciones internas ────────────────────────────────────────────────

  async findMyNotifications(userId: string, onlyUnread = false) {
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
        id: n.id,
        type: n.type,
        priority: n.priority,
        title: n.title,
        message: n.message,
        is_read: n.is_read,
        read_at: n.read_at,
        created_at: n.created_at,
        sender: n.sender
          ? {
              id: n.sender.id,
              first_name: n.sender.first_name,
              last_name: n.sender.last_name,
              position: n.sender.position,
            }
          : null,
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
    if (!notif) throw new NotFoundException('Notificación no encontrada');
    if (notif.is_read) return { message: 'Ya estaba marcada como leída' };
    await this.notifRepo.update(id, { is_read: true, read_at: new Date() });
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
    if (!notif) throw new NotFoundException('Notificación no encontrada');
    await this.notifRepo.remove(notif);
    return { message: 'Notificación eliminada' };
  }

  async createSystem(payload: {
    user_id: string;
    title: string;
    message: string;
    priority?: NotificationPriority;
    type?: NotificationType;
    data?: Record<string, any>;
  }) {
    const notif = this.notifRepo.create({
      type: payload.type ?? NotificationType.SYSTEM,
      priority: payload.priority ?? NotificationPriority.LOW,
      title: payload.title,
      message: payload.message,
      data: payload.data,
      is_read: false,
    });
    notif.user = { id: payload.user_id } as any;
    const saved = await this.notifRepo.save(notif);

    this.gateway.sendToUser(payload.user_id, {
      id: saved.id,
      title: saved.title,
      message: saved.message,
      priority: saved.priority,
      type: saved.type,
      is_read: false,
      sender: null,
    });

    void this.sendWebPushToUser(payload.user_id, {
      title: saved.title,
      body: saved.message,
      data: { notification_id: saved.id, url: '/notifications', ...payload.data },
    });

    return saved;
  }
}
