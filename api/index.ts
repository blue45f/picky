import { getApiRequestHandler } from './_handler';

export default async function handler(req: any, res: any) {
  const pathMatch = new URL(`https://example.com${req.url}`).searchParams.get('path');
  if (pathMatch) {
    const requestUrl = new URL(`https://example.com${req.url}`);
    requestUrl.searchParams.delete('path');

    const rest = requestUrl.searchParams.toString();
    const normalizedPath = pathMatch.replace(/^\/+/, '');
    const rewrittenPath = `/${normalizedPath}${rest ? `?${rest}` : ''}`;
    req.url = `/api${rewrittenPath}`;
  }

  const handler = await getApiRequestHandler();
  return handler(req, res);
}
