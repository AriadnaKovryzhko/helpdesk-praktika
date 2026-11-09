import { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';

describe('GET /api/health', () => {
  let app: NestExpressApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication<NestExpressApplication>();
    configureApp(app);
    await app.init();
  });

  afterAll(() => app.close());

  it('возвращает статус в едином формате', async () => {
    const response = await request(app.getHttpServer()).get('/api/health').expect(200);
    expect(response.body.data.status).toBe('ok');
    expect(response.body.meta).toBeNull();
  });

  it('возвращает ошибку в едином формате для неизвестного пути', async () => {
    const response = await request(app.getHttpServer()).get('/api/unknown').expect(404);
    expect(response.body.error.code).toBe('NOT_FOUND');
  });
});
