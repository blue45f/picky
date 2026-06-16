import { getApiRequestHandler } from '../../_handler';

export default async function handler(req: any, res: any) {
  const handler = await getApiRequestHandler();
  return handler(req, res);
}
