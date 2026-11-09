import { Injectable, Logger } from '@nestjs/common';
import {
  OnGatewayConnection,
  OnGatewayInit,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Notification } from '@prisma/client';
import { Server, Socket } from 'socket.io';
import { TokenService } from '../auth/token.service';

const userRoom = (userId: string): string => `user:${userId}`;

@Injectable()
@WebSocketGateway()
export class NotificationsGateway implements OnGatewayInit, OnGatewayConnection {
  @WebSocketServer()
  private server: Server;

  private readonly logger = new Logger(NotificationsGateway.name);

  constructor(private readonly tokens: TokenService) {}

  // Проверка в middleware отклоняет подключение ещё до установления соединения.
  afterInit(server: Server): void {
    server.use((socket, next) => {
      this.authenticate(socket)
        .then(() => next())
        .catch(() => next(new Error('UNAUTHORIZED')));
    });
  }

  handleConnection(socket: Socket): void {
    const userId = socket.data.userId as string;
    void socket.join(userRoom(userId));
    this.logger.debug(`Подключён пользователь ${userId}`);
  }

  send(notification: Notification): void {
    this.server?.to(userRoom(notification.userId)).emit('notification', notification);
  }

  disconnectUser(userId: string): void {
    this.server?.in(userRoom(userId)).disconnectSockets(true);
  }

  private async authenticate(socket: Socket): Promise<void> {
    const token = (socket.handshake.auth as { token?: string }).token;
    const user = await this.tokens.authenticateAccessToken(token);
    socket.data.userId = user.id;
  }
}
