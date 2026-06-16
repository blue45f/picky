import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import helmet from 'helmet';
import compression from 'compression';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable CORS for frontend integration
  app.enableCors({
    origin: '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
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
  await app.listen(port);
}
bootstrap();
