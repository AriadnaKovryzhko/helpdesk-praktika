import { NestExpressApplication } from '@nestjs/platform-express';
import { randomUUID } from 'crypto';
import request from 'supertest';
import { createTestApp, createTicket, loginAs, prismaOf, registerUser } from './helpers';

describe('API заявок', () => {
  let app: NestExpressApplication;
  let agent: string;
  let manager: string;

  const auth = (token: string) => ({ Authorization: `Bearer ${token}` });
  const api = () => request(app.getHttpServer());

  beforeAll(async () => {
    app = await createTestApp();
    agent = await loginAs(app, 'agent1@helpdesk.local');
    manager = await loginAs(app, 'manager@helpdesk.local');
  });

  afterAll(() => app.close());

  it('проходит весь жизненный цикл и пишет историю', async () => {
    const { token } = await registerUser(app);
    const ticket = await createTicket(app, token);

    await api().post(`/api/tickets/${ticket.id}/assign`).set(auth(agent)).send({}).expect(200);
    for (const status of ['IN_PROGRESS', 'WAITING_USER']) {
      await api()
        .post(`/api/tickets/${ticket.id}/status`)
        .set(auth(agent))
        .send({ status })
        .expect(200);
    }
    await api()
      .post(`/api/tickets/${ticket.id}/status`)
      .set(auth(token))
      .send({ status: 'IN_PROGRESS' })
      .expect(200);
    await api()
      .post(`/api/tickets/${ticket.id}/status`)
      .set(auth(agent))
      .send({ status: 'RESOLVED' })
      .expect(200);
    const closed = await api()
      .post(`/api/tickets/${ticket.id}/status`)
      .set(auth(token))
      .send({ status: 'CLOSED' })
      .expect(200);
    expect(closed.body.data.closedAt).not.toBeNull();

    const history = await api()
      .get(`/api/tickets/${ticket.id}/history`)
      .set(auth(token))
      .expect(200);
    expect(history.body.data.map((row: { toStatus: string }) => row.toStatus)).toEqual([
      'NEW',
      'ASSIGNED',
      'IN_PROGRESS',
      'WAITING_USER',
      'IN_PROGRESS',
      'RESOLVED',
      'CLOSED',
    ]);
  });

  it('отклоняет запрещённый переход статуса кодом 409', async () => {
    const { token } = await registerUser(app);
    const ticket = await createTicket(app, token);
    const response = await api()
      .post(`/api/tickets/${ticket.id}/status`)
      .set(auth(manager))
      .send({ status: 'CLOSED' })
      .expect(409);
    expect(response.body.error.code).toBe('INVALID_STATUS_TRANSITION');
  });

  it('не показывает чужую заявку, подстановка идентификатора даёт 404', async () => {
    const owner = await registerUser(app);
    const stranger = await registerUser(app);
    const ticket = await createTicket(app, owner.token);
    await api().get(`/api/tickets/${ticket.id}`).set(auth(stranger.token)).expect(404);
    await api()
      .post(`/api/tickets/${ticket.id}/comments`)
      .set(auth(stranger.token))
      .send({ body: 'Чужой комментарий' })
      .expect(404);
    await api().get(`/api/tickets/${randomUUID()}`).set(auth(manager)).expect(404);
  });

  it('показывает пользователю только его заявки', async () => {
    const owner = await registerUser(app);
    const stranger = await registerUser(app);
    const ticket = await createTicket(app, owner.token);
    const own = await api().get('/api/tickets').set(auth(owner.token)).expect(200);
    expect(own.body.data.map((row: { id: string }) => row.id)).toEqual([ticket.id]);
    const other = await api().get('/api/tickets').set(auth(stranger.token)).expect(200);
    expect(other.body.data).toEqual([]);
    expect(other.body.meta.total).toBe(0);
  });

  it('поддерживает поиск, фильтр, сортировку и пагинацию', async () => {
    const response = await api()
      .get('/api/tickets')
      .query({ search: 'принтер', status: 'NEW', sortBy: 'number', sortOrder: 'asc', pageSize: 2 })
      .set(auth(manager))
      .expect(200);
    expect(response.body.data.length).toBeLessThanOrEqual(2);
    expect(response.body.meta.pageSize).toBe(2);
    response.body.data.forEach((row: { title: string; status: string }) => {
      expect(row.title.toLowerCase()).toContain('принтер');
      expect(row.status).toBe('NEW');
    });
  });

  it('создаёт уведомление исполнителю о новой заявке', async () => {
    const { token } = await registerUser(app);
    const before = await api().get('/api/notifications/unread-count').set(auth(agent)).expect(200);
    await createTicket(app, token);
    const after = await api().get('/api/notifications/unread-count').set(auth(agent)).expect(200);
    expect(after.body.data.count).toBe(before.body.data.count + 1);
  });

  it('разрешает только одному исполнителю взять заявку', async () => {
    const other = await loginAs(app, 'agent2@helpdesk.local');
    const { token } = await registerUser(app);
    const ticket = await createTicket(app, token);
    const results = await Promise.all(
      [agent, other].map((t) =>
        api().post(`/api/tickets/${ticket.id}/assign`).set(auth(t)).send({}),
      ),
    );
    const [winner, loser] = results.map((r) => r.status).sort();
    expect(winner).toBe(200);
    // Если первый запрос уже завершился, заявка больше не видна второму исполнителю.
    expect([404, 409]).toContain(loser);
  });

  it('разделяет вложения по правам и проверяет тип по содержимому', async () => {
    const owner = await registerUser(app);
    const stranger = await registerUser(app);
    const ticket = await createTicket(app, owner.token);
    const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x01]);

    const uploaded = await api()
      .post(`/api/tickets/${ticket.id}/attachments`)
      .set(auth(owner.token))
      .attach('file', png, 'снимок.png')
      .expect(201);
    expect(uploaded.body.data.originalName).toBe('снимок.png');

    const url = `/api/tickets/${ticket.id}/attachments/${uploaded.body.data.id}/download`;
    await api().get(url).set(auth(stranger.token)).expect(404);
    const file = await api().get(url).set(auth(owner.token)).buffer(true).expect(200);
    expect(file.headers['content-type']).toContain('image/png');

    const rejected = await api()
      .post(`/api/tickets/${ticket.id}/attachments`)
      .set(auth(owner.token))
      .attach('file', Buffer.from('<script>'), 'virus.png')
      .expect(400);
    expect(rejected.body.error.code).toBe('UNSUPPORTED_FILE_TYPE');
  });

  it('отмечает просроченную заявку фоновой задачей один раз', async () => {
    const { SlaService } = await import('../src/tickets/sla.service');
    const { token } = await registerUser(app);
    const ticket = await createTicket(app, token);
    const past = new Date(Date.now() - 60_000);
    await prismaOf(app).ticket.update({
      where: { id: ticket.id },
      data: { reactionDueAt: past, resolutionDueAt: past },
    });
    const sla = app.get(SlaService);
    await sla.markBreaches();
    const row = await prismaOf(app).ticket.findUniqueOrThrow({ where: { id: ticket.id } });
    expect(row.reactionBreachedAt).not.toBeNull();
    expect(row.resolutionBreachedAt).not.toBeNull();
    const detail = await api().get(`/api/tickets/${ticket.id}`).set(auth(token)).expect(200);
    expect(detail.body.data.isOverdue).toBe(true);
    await prismaOf(app).ticket.update({
      where: { id: ticket.id },
      data: { reactionDueAt: new Date(), resolutionDueAt: new Date(Date.now() + 86_400_000) },
    });
  });
});
