import { ConfigService } from '@nestjs/config';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, OpenAPIObject, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
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
  app.setGlobalPrefix('api');
  app.set('trust proxy', 1);
  // CSP для SPA задаёт Nginx; здесь она сломала бы встроенные скрипты Swagger UI.
  app.use(helmet({ contentSecurityPolicy: false }));
  app.enableCors({
    origin: (config.get<string>('CORS_ORIGIN') ?? '').split(',').filter(Boolean),
    credentials: true,
  });
  app.useGlobalPipes(createValidationPipe());
  app.useGlobalFilters(new AllExceptionsFilter());
  app.useGlobalInterceptors(new ResponseInterceptor());
  SwaggerModule.setup('api/docs', app, buildOpenApiDocument(app));
}
