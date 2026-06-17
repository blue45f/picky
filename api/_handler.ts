import { createApiServer } from '../serverless-api/main.js';

let cachedHandler: ((req: any, res: any) => Promise<void> | void) | null = null;

const initNestApp = async () => {
  const app = await createApiServer();

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
