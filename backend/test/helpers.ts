import { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import { randomUUID } from 'crypto';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';
import { PrismaService } from '../src/prisma/prisma.service';

export const SEED_PASSWORD = 'Password123!';

export async function createTestApp(): Promise<NestExpressApplication> {
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
  const app = moduleRef.createNestApplication<NestExpressApplication>();
  configureApp(app);
  await app.listen(0);
  return app;
}

export async function loginAs(app: NestExpressApplication, email: string): Promise<string> {
  const response = await request(app.getHttpServer())
    .post('/api/auth/login')
    .send({ email, password: SEED_PASSWORD })
    .expect(200);
  return response.body.data.accessToken as string;
}

export async function registerUser(
  app: NestExpressApplication,
): Promise<{ token: string; email: string; id: string; cookie: string; password: string }> {
  const email = `${randomUUID()}@example.com`;
  const password = 'Secret1234';
  const response = await request(app.getHttpServer())
    .post('/api/auth/register')
    .send({ email, password, fullName: 'Тестовый Пользователь' })
    .expect(201);
  return {
    token: response.body.data.accessToken as string,
    id: response.body.data.user.id as string,
    cookie: (response.headers['set-cookie'] as unknown as string[])[0].split(';')[0],
    email,
    password,
  };
}

export const prismaOf = (app: NestExpressApplication): PrismaService => app.get(PrismaService);

export async function firstCategoryId(app: NestExpressApplication): Promise<number> {
  const category = await prismaOf(app).category.findFirstOrThrow({ where: { isActive: true } });
  return category.id;
}

export async function createTicket(
  app: NestExpressApplication,
  token: string,
): Promise<{ id: string; number: number }> {
  const response = await request(app.getHttpServer())
    .post('/api/tickets')
    .set('Authorization', `Bearer ${token}`)
    .send({
      title: 'Тестовая заявка',
      description: 'Описание тестовой заявки',
      categoryId: await firstCategoryId(app),
      priority: 'HIGH',
    })
    .expect(201);
  return response.body.data as { id: string; number: number };
}
