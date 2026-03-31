import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { Logger } from '@nestjs/common';

@WebSocketGateway({
  // Mismo puerto que el HTTP — socket.io comparte el servidor
  cors: {
    origin:      process.env.FRONTEND_URL ?? 'http://localhost:3001',
    credentials: true,
  },
  // Namespace dedicado para notificaciones
  namespace: '/notifications',
})
export class NotificationsGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger('NotificationsGateway');

  // Mapa de userId → Set de socketIds
  // Un usuario puede tener múltiples pestañas/dispositivos conectados
  private userSockets = new Map<string, Set<string>>();

  constructor(private readonly jwtService: JwtService) {}

  afterInit() {
    this.logger.log('WebSocket Gateway inicializado');
  }

  async handleConnection(client: Socket) {
    try {
      // Verificar JWT enviado en el handshake
      const token =
        client.handshake.auth?.token ||
        client.handshake.headers?.authorization?.replace('Bearer ', '');

      if (!token) {
        client.disconnect(true);
        return;
      }

      const payload = await this.jwtService.verifyAsync(token, {
        secret: process.env.JWT_SECRET,
      });

      const userId: string = payload.sub;

      // Guardar en el mapa userId → socketId
      if (!this.userSockets.has(userId)) {
        this.userSockets.set(userId, new Set());
      }
      this.userSockets.get(userId)!.add(client.id);

      // Guardar el userId en el socket para usarlo al desconectar
      client.data.userId = userId;

      // Unirse a una room personal — fácil para emitir a un usuario
      client.join(`user:${userId}`);

      this.logger.debug(`Cliente conectado: userId=${userId} socketId=${client.id}`);
    } catch {
      // Token inválido o expirado
      client.disconnect(true);
    }
  }

  handleDisconnect(client: Socket) {
    const userId = client.data?.userId;
    if (userId) {
      const sockets = this.userSockets.get(userId);
      sockets?.delete(client.id);
      if (sockets?.size === 0) {
        this.userSockets.delete(userId);
      }
    }
    this.logger.debug(`Cliente desconectado: socketId=${client.id}`);
  }

  // ── Método público para emitir desde el service ───────────────
  // Se llama así: this.gateway.sendToUser(recipientId, notification)
  sendToUser(userId: string, notification: any) {
    this.server.to(`user:${userId}`).emit('notification:new', notification);
    this.logger.debug(`Notificación enviada a userId=${userId}`);
  }

  // Emitir a todos los usuarios conectados (para notifs del sistema)
  broadcast(notification: any) {
    this.server.emit('notification:new', notification);
  }
}