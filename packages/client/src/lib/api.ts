const trimTrailingSlashes = (value: string): string => {
  let end = value.length;
  while (end > 0 && value.codePointAt(end - 1) === 47) {
    end -= 1;
  }
  return end === value.length ? value : value.slice(0, end);
};

const normalizeApiBase = (rawBase: string): string => {
  const trimmed = trimTrailingSlashes(rawBase.trim());
  if (!trimmed) {
    return trimmed;
  }

  const needsProtocol =
    !trimmed.startsWith('/') &&
    !trimmed.startsWith('http://') &&
    !trimmed.startsWith('https://') &&
    !trimmed.startsWith('//');
  const normalizedRaw = needsProtocol ? `https://${trimmed}` : trimmed;

  if (trimmed.startsWith('/')) {
    return trimmed === '/' ? '/api' : trimmed;
  }

  try {
    const parsed = new URL(normalizedRaw);
    const hasRootPath = !parsed.pathname || parsed.pathname === '/';
    if (hasRootPath) {
      return `${parsed.origin}/api`;
    }

    return `${parsed.origin}${parsed.pathname}`;
  } catch {
    return trimmed;
  }
};

const PREFERRED_API_BASE_KEY = 'picky_api_base_preferred';

const getPreferredApiBase = (): string | undefined => {
  if (typeof globalThis.window === 'undefined') {
    return undefined;
  }

  const raw = globalThis.localStorage.getItem(PREFERRED_API_BASE_KEY)?.trim();
  if (!raw) {
    return undefined;
  }

  return raw;
};

const persistPreferredApiBase = (base: string) => {
  if (typeof globalThis.window === 'undefined') {
    return;
  }

  const trimmed = base.trim();
  if (!trimmed) {
    return;
  }

  localStorage.setItem(PREFERRED_API_BASE_KEY, trimmed);
};

const dedupe = <T>(items: T[]): T[] => Array.from(new Set(items));

const getWindowApiCandidates = (): string[] => {
  if (typeof globalThis.window === 'undefined') {
    return [];
  }

  const { protocol, host } = globalThis.location;
  return [normalizeApiBase(`${protocol}//${host}/api`)];
};

const getLocalDevApiCandidates = (): string[] => {
  if (typeof globalThis.window === 'undefined') {
    return [];
  }

  const { hostname } = globalThis.location;
  if (hostname !== 'localhost' && hostname !== '127.0.0.1') {
    return [];
  }

  return [
    normalizeApiBase('http://localhost:3000/api'),
    normalizeApiBase('http://127.0.0.1:3000/api'),
  ];
};

const getCustomApiCandidateFromWindow = (): string[] => {
  if (typeof globalThis.window === 'undefined') {
    return [];
  }

  const rawCandidate = new URLSearchParams(globalThis.location.search).get('api_base')?.trim();
  if (!rawCandidate) {
    return [];
  }

  return [normalizeApiBase(rawCandidate)];
};

const getVercelApiCandidates = (): string[] => {
  if (typeof globalThis.window === 'undefined') {
    return [];
  }

  const { protocol, hostname } = globalThis.location;
  if (!hostname?.endsWith('.vercel.app')) {
    return [];
  }

  const baseHost = hostname.replace(/\.vercel\.app$/, '');
  if (!baseHost) {
    return [];
  }

  const withoutGitSuffix = baseHost.replace(/-git-[a-z0-9-]+$/i, '');

  const hostGroups = dedupe([
    baseHost,
    withoutGitSuffix,
    baseHost.replace(/-web$/, ''),
    baseHost.replace(/-app$/, ''),
    baseHost.replace(/-api$/, ''),
  ]).filter(Boolean);

  const apiHosts = dedupe([
    `${baseHost}-api.vercel.app`,
    ...hostGroups.map((value) => `${value}-api.vercel.app`),
    ...hostGroups.map((value) => `api-${value}.vercel.app`),
    ...hostGroups.map((value) => `api.${value}.vercel.app`),
  ]);

  return dedupe([...apiHosts.map((host) => normalizeApiBase(`${protocol}//${host}/api`))]).filter(
    (candidate) => candidate && candidate !== '/',
  );
};

const getApiCandidates = (): string[] => {
  const explicitBase = import.meta.env.VITE_API_BASE_URL?.trim();
  if (explicitBase) {
    const explicitCandidates = [normalizeApiBase(explicitBase)];
    const runtimeCandidates = getWindowApiCandidates();
    const customCandidate = getCustomApiCandidateFromWindow();
    const vercelCandidates = getVercelApiCandidates();
    return dedupe([
      ...explicitCandidates,
      ...getLocalDevApiCandidates(),
      ...customCandidate,
      ...runtimeCandidates,
      ...vercelCandidates,
    ]);
  }

  const preferredBase = getPreferredApiBase();
  const preferred = preferredBase ? [normalizeApiBase(preferredBase)] : [];
  const customCandidates = getCustomApiCandidateFromWindow();
  const vercelCandidates = getVercelApiCandidates();
  const baseCandidates = getWindowApiCandidates();
  const localDevCandidates = getLocalDevApiCandidates();

  if (typeof globalThis.window === 'undefined') {
    return ['/api', ...preferred];
  }

  return dedupe([
    ...customCandidates,
    ...localDevCandidates,
    ...baseCandidates,
    ...preferred,
    ...vercelCandidates,
  ]);
};

const isLikelyStaticHtmlResponse = (res: Response): boolean => {
  const contentType = (res.headers.get('content-type') || '').toLowerCase();
  const isHtmlResponse =
    contentType.includes('text/html') || contentType.includes('application/xhtml+xml');
  if (!isHtmlResponse) {
    return false;
  }

  return true;
};

const shouldRetryOnFailure = (
  res: Response,
  index: number,
  total: number,
  base: string,
  method: string,
): boolean => {
  if (index >= total - 1) {
    return false;
  }

  if (isLikelyStaticHtmlResponse(res)) {
    return true;
  }

  if ((method === 'GET' || method === 'HEAD') && res.status >= 500) {
    return true;
  }

  const isVercelFallbackProbe =
    typeof globalThis.window !== 'undefined' &&
    globalThis.location.hostname.endsWith('.vercel.app') &&
    base.includes(`${globalThis.location.host}/api`) &&
    !base.includes('-api.vercel.app');

  if (isVercelFallbackProbe && res.status === 404) {
    return true;
  }

  if (res.status === 404 && base.includes('/api')) {
    return true;
  }

  return res.status === 405;
};

const isApiDebugEnabled = (): boolean => {
  if (import.meta.env.DEV) {
    return true;
  }

  if (typeof globalThis.window === 'undefined') {
    return false;
  }

  const raw = globalThis.localStorage.getItem('picky_api_debug');
  if (raw === '1' || raw?.toLowerCase() === 'true') {
    return true;
  }

  const query = new URLSearchParams(globalThis.location.search);
  const debugParam = query.get('api_debug');
  return debugParam === '1' || debugParam?.toLowerCase() === 'true';
};

type ApiTraceEntry = { base: string; ok: boolean; status?: number; error?: string };

type ApiAttemptResult =
  | { kind: 'return'; response: Response }
  | { kind: 'retry'; response: Response }
  | { kind: 'error'; error: Error };

type ApiAttemptContext = {
  path: string;
  init: RequestInit;
  candidatesLength: number;
  requestMethod: string;
  debug: boolean;
  hasExplicitBase: boolean;
  trace: ApiTraceEntry[];
};

const attemptApiRequest = async (
  base: string,
  index: number,
  ctx: ApiAttemptContext,
): Promise<ApiAttemptResult> => {
  try {
    const res = await fetch(`${base}${ctx.path}`, ctx.init);
    const needRetry = shouldRetryOnFailure(
      res,
      index,
      ctx.candidatesLength,
      base,
      ctx.requestMethod,
    );
    ctx.trace.push({ base, ok: !needRetry, status: res.status });
    if (ctx.debug) {
      console.info('[picky] requestApi attempt', {
        path: ctx.path,
        base,
        status: res.status,
        retry: needRetry,
      });
    }

    if (!needRetry) {
      if (!ctx.hasExplicitBase && res.ok) {
        persistPreferredApiBase(base);
      }
      return { kind: 'return', response: res };
    }

    return { kind: 'retry', response: res };
  } catch (err: any) {
    ctx.trace.push({ base, ok: false, error: String(err?.message || err) });
    if (ctx.debug) {
      console.error('[picky] requestApi error', {
        path: ctx.path,
        base,
        error: String(err?.message || err),
      });
    }
    return { kind: 'error', error: err instanceof Error ? err : new Error(String(err)) };
  }
};

const resolveApiOutcome = (
  path: string,
  lastResponse: Response | null,
  lastError: Error | null,
): Response => {
  if (lastResponse) {
    if (isLikelyStaticHtmlResponse(lastResponse)) {
      throw new Error(
        `API 응답이 정적 HTML 페이지입니다. ${path} 요청 대상이 맞는지 확인해 주세요. (${lastResponse.url})`,
      );
    }
    return lastResponse;
  }

  if (lastError) {
    throw lastError;
  }

  throw new Error('API 서버를 찾을 수 없습니다. VITE_API_BASE_URL를 확인해 주세요.');
};

export const requestApi = async (path: string, init: RequestInit = {}): Promise<Response> => {
  const hasExplicitBase = Boolean(import.meta.env.VITE_API_BASE_URL?.trim());
  const candidates = getApiCandidates();
  let lastResponse: Response | null = null;
  let lastError: Error | null = null;
  const trace: ApiTraceEntry[] = [];
  const debug = isApiDebugEnabled();
  const isProdLike =
    typeof globalThis.window !== 'undefined' && globalThis.location.hostname.includes('vercel.app');
  const ctx: ApiAttemptContext = {
    path,
    init,
    candidatesLength: candidates.length,
    requestMethod: String(init.method || 'GET').toUpperCase(),
    debug,
    hasExplicitBase,
    trace,
  };

  for (let i = 0; i < candidates.length; i += 1) {
    const base = candidates[i];
    if (!base) {
      continue;
    }
    const result = await attemptApiRequest(base, i, ctx);
    if (result.kind === 'return') {
      return result.response;
    }
    if (result.kind === 'retry') {
      lastResponse = result.response;
    } else {
      lastError = result.error;
    }
  }

  if ((isProdLike || debug) && path.startsWith('/auth/')) {
    console.info('[picky] requestApi trace', path, trace);
  }

  return resolveApiOutcome(path, lastResponse, lastError);
};

export const getApiBaseUrl = (): string => {
  return getApiCandidates()[0] || '/api';
};

export const parseApiPayload = async (res: Response): Promise<any> => {
  const contentType = res.headers.get('content-type') || '';

  if (contentType.includes('application/json')) {
    try {
      return await res.json();
    } catch {
      return {
        message: `${res.status} ${res.statusText} (${res.url})`,
      };
    }
  }

  try {
    const text = await res.text();
    const trimmedText = (text || '').trim();
    const isDeploymentNotFound =
      trimmedText.includes('DEPLOYMENT_NOT_FOUND') ||
      trimmedText.includes('Deployment could not be found');

    if (!trimmedText) {
      return {
        message: `${res.status} ${res.statusText} (${res.url})`,
      };
    }

    if (trimmedText.startsWith('{') || trimmedText.startsWith('[')) {
      try {
        return JSON.parse(trimmedText);
      } catch {
        // keep raw message below
      }
    }

    if (trimmedText.startsWith('<!doctype') || trimmedText.startsWith('<html')) {
      return {
        message:
          'API 서버가 아닌 정적 HTML 페이지를 반환했습니다. ' +
          `VITE_API_BASE_URL이 맞는지 확인해 주세요. (${res.url})`,
      };
    }

    if (isDeploymentNotFound) {
      return {
        message:
          'Vercel API 배포를 찾을 수 없습니다. ' +
          '백엔드 배포 주소(VITE_API_BASE_URL) 또는 도메인 연결 상태를 확인해 주세요.',
      };
    }

    return {
      message: `${res.status} ${res.statusText} (${res.url})`,
      error: trimmedText.slice(0, 180),
    };
  } catch {
    return {
      message: `${res.status} ${res.statusText} (${res.url})`,
    };
  }
};
