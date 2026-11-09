import { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { createTestApp, loginAs, registerUser } from './helpers';

describe('API пользователей и панели руководителя', () => {
  let app: NestExpressApplication;
  let manager: string;

  const auth = (token: string) => ({ Authorization: `Bearer ${token}` });
  const api = () => request(app.getHttpServer());

  beforeAll(async () => {
    app = await createTestApp();
    manager = await loginAs(app, 'manager@helpdesk.local');
  });

  afterAll(() => app.close());

  it('закрывает панель руководителя от других ролей', async () => {
    const { token } = await registerUser(app);
    for (const path of ['/api/users', '/api/dashboard', '/api/audit-logs']) {
      const response = await api().get(path).set(auth(token)).expect(403);
      expect(response.body.error.code).toBe('FORBIDDEN');
    }
    await api().get('/api/users').expect(401);
  });

  it('блокировка закрывает вход, отзывает токены и действует сразу', async () => {
    const target = await registerUser(app);
    await api().get('/api/users/me').set(auth(target.token)).expect(200);
    await api().post(`/api/users/${target.id}/block`).set(auth(manager)).expect(200);

    const current = await api().get('/api/users/me').set(auth(target.token)).expect(401);
    expect(current.body.error.code).toBe('ACCOUNT_BLOCKED');
    await api().post('/api/auth/refresh').set('Cookie', target.cookie).expect(401);
    const login = await api()
      .post('/api/auth/login')
      .send({ email: target.email, password: target.password })
      .expect(403);
    expect(login.body.error.code).toBe('ACCOUNT_BLOCKED');

    await api().post(`/api/users/${target.id}/unblock`).set(auth(manager)).expect(200);
    await api()
      .post('/api/auth/login')
      .send({ email: target.email, password: target.password })
      .expect(200);
  });

  it('смена роли сразу меняет права', async () => {
    const target = await registerUser(app);
    await api().get('/api/users').set(auth(target.token)).expect(403);
    await api()
      .put(`/api/users/${target.id}/roles`)
      .set(auth(manager))
      .send({ roles: ['MANAGER'] })
      .expect(200);
    await api().get('/api/users').set(auth(target.token)).expect(200);
  });

  it('фильтрует список пользователей на сервере', async () => {
    const response = await api()
      .get('/api/users')
      .query({ role: 'AGENT', sortBy: 'email', sortOrder: 'asc' })
      .set(auth(manager))
      .expect(200);
    expect(response.body.data.length).toBeGreaterThanOrEqual(2);
    response.body.data.forEach((user: { roles: string[]; passwordHash?: string }) => {
      expect(user.roles).toContain('AGENT');
      expect(user.passwordHash).toBeUndefined();
    });
  });

  it('отдаёт данные дашборда и записи журнала', async () => {
    const dashboard = await api().get('/api/dashboard').set(auth(manager)).expect(200);
    expect(dashboard.body.data.byStatus).toHaveLength(6);
    expect(dashboard.body.data.agentLoad.length).toBeGreaterThanOrEqual(2);
    expect(dashboard.body.data.createdByDay).toHaveLength(14);

    const audit = await api()
      .get('/api/audit-logs')
      .query({ action: 'LOGIN_SUCCESS', pageSize: 5 })
      .set(auth(manager))
      .expect(200);
    expect(audit.body.data.length).toBeGreaterThan(0);
    expect(audit.body.data[0].actor.email).toEqual(expect.any(String));
  });

  it('меняет пароль только при верном текущем', async () => {
    const target = await registerUser(app);
    await api()
      .post('/api/users/me/password')
      .set(auth(target.token))
      .send({ currentPassword: 'Wrong12345', newPassword: 'Another1234' })
      .expect(400);
    await api()
      .post('/api/users/me/password')
      .set(auth(target.token))
      .send({ currentPassword: target.password, newPassword: 'Another1234' })
      .expect(204);
    await api()
      .post('/api/auth/login')
      .send({ email: target.email, password: 'Another1234' })
      .expect(200);
  });

  it('управляет справочниками и проверяет ссылочную целостность', async () => {
    const created = await api()
      .post('/api/categories')
      .set(auth(manager))
      .send({ name: `Тест ${Date.now()}` })
      .expect(201);
    await api().delete(`/api/categories/${created.body.data.id}`).set(auth(manager)).expect(204);
    const list = await api().get('/api/categories').set(auth(manager)).expect(200);
    const used = list.body.data[0];
    const conflict = await api()
      .delete(`/api/categories/${used.id}`)
      .set(auth(manager))
      .expect(409);
    expect(conflict.body.error.code).toBe('CATEGORY_IN_USE');
  });
});
