import { ConfigService } from '@nestjs/config';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, OpenAPIObject, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { CorsIoAdapter } from './common/adapters/cors-io.adapter';
import { requestContextMiddleware } from './common/context/request-context';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { createValidationPipe } from './common/pipes/validation.pipe';

export function buildOpenApiDocument(app: NestExpressApplication): OpenAPIObject {
  const config = new DocumentBuilder()
    .setTitle('Help Desk API')
    .setDescription('Сервис учёта заявок в техподдержку')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  return SwaggerModule.createDocument(app, config);
}

export function configureApp(app: NestExpressApplication): void {
  const config = app.get(ConfigService);
  const origins = (config.get<string>('CORS_ORIGIN') ?? '').split(',').filter(Boolean);
  app.setGlobalPrefix('api');
  app.set('trust proxy', 1);
  // CSP для SPA задаёт Nginx; здесь она сломала бы встроенные скрипты Swagger UI.
  app.use(helmet({ contentSecurityPolicy: false }));
  app.use(cookieParser());
  app.use(requestContextMiddleware);
  app.enableCors({ origin: origins, credentials: true });
  app.useWebSocketAdapter(new CorsIoAdapter(app, origins));
  app.useGlobalPipes(createValidationPipe());
  app.useGlobalFilters(new AllExceptionsFilter());
  app.useGlobalInterceptors(new ResponseInterceptor());
  SwaggerModule.setup('api/docs', app, buildOpenApiDocument(app));
}
