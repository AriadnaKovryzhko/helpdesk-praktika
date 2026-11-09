import { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import { randomUUID } from 'crypto';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';

describe('API аутентификации', () => {
  let app: NestExpressApplication;
  const password = 'Secret1234';

  const cookieFrom = (response: request.Response): string =>
    (response.headers['set-cookie'] as unknown as string[])[0].split(';')[0];

  const register = (email: string) =>
    request(app.getHttpServer())
      .post('/api/auth/register')
      .send({ email, password, fullName: 'Тестовый Пользователь' });

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication<NestExpressApplication>();
    configureApp(app);
    await app.init();
  });

  afterAll(() => app.close());

  it('регистрирует пользователя с ролью USER и ставит httpOnly cookie', async () => {
    const email = `${randomUUID()}@example.com`;
    const response = await register(email).expect(201);
    expect(response.body.data.user.roles).toEqual(['USER']);
    expect(response.body.data.accessToken).toEqual(expect.any(String));
    expect(response.body.data.user.passwordHash).toBeUndefined();
    expect(response.headers['set-cookie'][0]).toContain('HttpOnly');
  });

  it('отклоняет некорректные данные сообщениями на русском', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({ email: 'нет', password: '1', fullName: '' })
      .expect(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
    const fields = response.body.error.details.map((item: { field: string }) => item.field);
    expect(fields).toEqual(expect.arrayContaining(['email', 'password', 'fullName']));
  });

  it('не даёт войти с неверным паролем', async () => {
    const email = `${randomUUID()}@example.com`;
    await register(email).expect(201);
    const response = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email, password: 'Wrong12345' })
      .expect(401);
    expect(response.body.error.code).toBe('INVALID_CREDENTIALS');
  });

  it('ротирует refresh-токен и не принимает старый', async () => {
    const created = await register(`${randomUUID()}@example.com`).expect(201);
    const firstCookie = cookieFrom(created);
    const rotated = await request(app.getHttpServer())
      .post('/api/auth/refresh')
      .set('Cookie', firstCookie)
      .expect(200);
    expect(cookieFrom(rotated)).not.toEqual(firstCookie);
    await request(app.getHttpServer())
      .post('/api/auth/refresh')
      .set('Cookie', firstCookie)
      .expect(401);
  });

  it('требует токен для защищённых маршрутов и завершает сессию при выходе', async () => {
    const created = await register(`${randomUUID()}@example.com`).expect(201);
    const cookie = cookieFrom(created);
    await request(app.getHttpServer()).post('/api/auth/logout').set('Cookie', cookie).expect(204);
    await request(app.getHttpServer()).post('/api/auth/refresh').set('Cookie', cookie).expect(401);
  });
});
