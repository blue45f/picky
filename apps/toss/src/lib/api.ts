const normalizeApiBase = (rawBase: string): string => {
  const trimmed = rawBase.trim().replace(/\/+$/, '');
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
  if (typeof window === 'undefined') {
    return undefined;
  }

  const raw = window.localStorage.getItem(PREFERRED_API_BASE_KEY)?.trim();
  if (!raw) {
    return undefined;
  }

  return raw ? raw : undefined;
};

const persistPreferredApiBase = (base: string) => {
  if (typeof window === 'undefined') {
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
  if (typeof window === 'undefined') {
    return [];
  }

  const { protocol, host } = window.location;
  return [normalizeApiBase(`${protocol}//${host}/api`)];
};

const getLocalDevApiCandidates = (): string[] => {
  if (typeof window === 'undefined') {
    return [];
  }

  const { hostname } = window.location;
  if (hostname !== 'localhost' && hostname !== '127.0.0.1') {
    return [];
  }

  return [
    normalizeApiBase('http://localhost:3000/api'),
    normalizeApiBase('http://127.0.0.1:3000/api'),
  ];
};

const getCustomApiCandidateFromWindow = (): string[] => {
  if (typeof window === 'undefined') {
    return [];
  }

  const rawCandidate = new URLSearchParams(window.location.search).get('api_base')?.trim();
  if (!rawCandidate) {
    return [];
  }

  return [normalizeApiBase(rawCandidate)];
};

const getVercelApiCandidates = (): string[] => {
  if (typeof window === 'undefined') {
    return [];
  }

  const { protocol, hostname } = window.location;
  if (!hostname || !hostname.endsWith('.vercel.app')) {
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
  ]).filter((value) => Boolean(value));

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

  if (typeof window === 'undefined') {
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
): boolean => {
  if (index >= total - 1) {
    return false;
  }

  if (isLikelyStaticHtmlResponse(res)) {
    return true;
  }

  if (res.status >= 500) {
    return true;
  }

  const isVercelFallbackProbe =
    typeof window !== 'undefined' &&
    window.location.hostname.endsWith('.vercel.app') &&
    base.includes(`${window.location.host}/api`) &&
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

  if (typeof window === 'undefined') {
    return false;
  }

  const raw = window.localStorage.getItem('picky_api_debug');
  if (raw === '1' || raw?.toLowerCase() === 'true') {
    return true;
  }

  const query = new URLSearchParams(window.location.search);
  const debugParam = query.get('api_debug');
  return debugParam === '1' || debugParam?.toLowerCase() === 'true';
};

export const requestApi = async (path: string, init: RequestInit = {}): Promise<Response> => {
  const explicitBase = import.meta.env.VITE_API_BASE_URL?.trim();
  const hasExplicitBase = Boolean(explicitBase);
  const candidates = getApiCandidates();
  let lastResponse: Response | null = null;
  let lastError: Error | null = null;
  const trace: Array<{ base: string; ok: boolean; status?: number; error?: string }> = [];
  const debug = isApiDebugEnabled();
  const isProdLike =
    typeof window !== 'undefined' && window.location.hostname.includes('vercel.app');

  for (let i = 0; i < candidates.length; i += 1) {
    const base = candidates[i];
    if (!base) {
      continue;
    }
    try {
      const res = await fetch(`${base}${path}`, init);
      const needRetry = shouldRetryOnFailure(res, i, candidates.length, base);
      trace.push({ base, ok: !needRetry, status: res.status });
      if (debug) {
        console.info('[picky] requestApi attempt', {
          path,
          base,
          status: res.status,
          retry: needRetry,
        });
      }

      if (!needRetry) {
        if (!hasExplicitBase && res.ok) {
          persistPreferredApiBase(base);
        }
        return res;
      }

      lastResponse = res;
    } catch (err: any) {
      trace.push({ base, ok: false, error: String(err?.message || err) });
      if (debug) {
        console.error('[picky] requestApi error', {
          path,
          base,
          error: String(err?.message || err),
        });
      }
      lastError = err instanceof Error ? err : new Error(String(err));
    }
  }

  if ((isProdLike || debug) && path.startsWith('/auth/')) {
    console.info('[picky] requestApi trace', path, trace);
  }

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
