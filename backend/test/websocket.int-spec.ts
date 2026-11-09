import { NestExpressApplication } from '@nestjs/platform-express';
import { AddressInfo } from 'net';
import { io, Socket } from 'socket.io-client';
import { createTestApp, createTicket, loginAs, registerUser } from './helpers';

describe('WebSocket-уведомления', () => {
  let app: NestExpressApplication;
  let url: string;
  const sockets: Socket[] = [];

  const connect = (token?: string): Socket => {
    const socket = io(url, { auth: { token }, transports: ['websocket'], reconnection: false });
    sockets.push(socket);
    return socket;
  };

  beforeAll(async () => {
    app = await createTestApp();
    url = `http://127.0.0.1:${(app.getHttpServer().address() as AddressInfo).port}`;
  });

  afterAll(async () => {
    sockets.forEach((socket) => socket.disconnect());
    await app.close();
  });

  it('отклоняет подключение без токена', async () => {
    const error = await new Promise<Error>((resolve) => {
      connect(undefined).on('connect_error', resolve);
    });
    expect(error.message).toBe('UNAUTHORIZED');
  });

  it('доставляет исполнителю уведомление о новой заявке', async () => {
    const socket = connect(await loginAs(app, 'agent1@helpdesk.local'));
    await new Promise<void>((resolve) => socket.on('connect', () => resolve()));
    const received = new Promise<{ type: string; title: string }>((resolve) => {
      socket.on('notification', resolve);
    });
    const { token } = await registerUser(app);
    const ticket = await createTicket(app, token);
    const notification = await received;
    expect(notification.type).toBe('TICKET_CREATED');
    expect(notification.title).toContain(String(ticket.number));
  });
});
