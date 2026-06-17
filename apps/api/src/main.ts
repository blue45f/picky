import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import helmet from 'helmet';
import compression from 'compression';
import { NestExpressApplication } from '@nestjs/platform-express';

export async function createApiServer() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  app.useBodyParser('json', { limit: '2mb' });
  app.useBodyParser('urlencoded', { extended: true, limit: '2mb' });

  // Enable CORS for frontend integration
  app.enableCors({
    origin: '*',
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'Origin', 'X-Requested-With'],
    preflightContinue: false,
    optionsSuccessStatus: 204,
  });

  // Enable security headers (disable CSP for API routes)
  app.use(helmet({ contentSecurityPolicy: false }));

  // Enable compression
  app.use(compression());

  // Enable graceful shutdown
  app.enableShutdownHooks();

  // Set API prefix
  app.setGlobalPrefix('api');

  const port = process.env.PORT || 3000;
  console.log(`Picky API starting on http://localhost:${port}/api`);
  await app.init();
  return app;
}

async function bootstrap() {
  const app = await createApiServer();
  const port = process.env.PORT || 3000;
  await app.listen(port);
}

if (require.main === module) {
  bootstrap();
}
