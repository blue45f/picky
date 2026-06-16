import { NestFactory } from '@nestjs/core';
import helmet from 'helmet';
import compression from 'compression';
import { AppModule } from '../apps/api/src/app.module';

let cachedHandler: ((req: any, res: any) => Promise<void> | void) | null = null;

const initNestApp = async () => {
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    preflightContinue: false,
    optionsSuccessStatus: 204,
  });

  app.use(helmet({ contentSecurityPolicy: false }));
  app.use(compression());
  app.setGlobalPrefix('api');

  await app.init();

  const httpAdapter = app.getHttpAdapter();
  const callback = httpAdapter.getInstance();
  cachedHandler = (req: any, res: any) => callback(req, res);
};

export const getApiRequestHandler = async () => {
  if (!cachedHandler) {
    await initNestApp();
  }

  return cachedHandler!;
};
