import { NestExpressApplication } from '@nestjs/platform-express';
import { readFileSync } from 'fs';
import { join } from 'path';
import { parse } from 'yaml';
import { buildOpenApiDocument } from '../src/app.setup';
import { createTestApp } from './helpers';

const METHODS = ['get', 'post', 'put', 'patch', 'delete'];

function routesOf(paths: Record<string, Record<string, unknown>>, prefix = ''): string[] {
  return Object.entries(paths)
    .flatMap(([path, item]) =>
      Object.keys(item)
        .filter((method) => METHODS.includes(method))
        .map((method) => `${method.toUpperCase()} ${prefix}${path}`),
    )
    .sort();
}

describe('Контракт OpenAPI', () => {
  let app: NestExpressApplication;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(() => app.close());

  it('docs/openapi.yaml описывает все маршруты приложения', () => {
    const file = parse(readFileSync(join(__dirname, '../../docs/openapi.yaml'), 'utf8'));
    const generated = buildOpenApiDocument(app).paths as Record<string, Record<string, unknown>>;
    expect(routesOf(file.paths, '/api')).toEqual(routesOf(generated));
  });
});
