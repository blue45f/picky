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

const getApiCandidates = (): string[] => {
  const explicitBase = import.meta.env.VITE_API_BASE_URL?.trim();
  if (explicitBase) {
    return [normalizeApiBase(explicitBase)];
  }

  if (typeof window === 'undefined') {
    return ['/api'];
  }

  const { protocol, host } = window.location;
  const base = `${protocol}//${host}/api`.replace(/\/$/, '');
  const match = host.match(/^(.*)\.vercel\.app$/);

  if (!match || match[1].endsWith('-api')) {
    return [base];
  }

  const hostWithApi = `${match[1]}-api.vercel.app`;
  const fallback = `${protocol}//${hostWithApi}/api`;
  return [base, fallback];
};

const isLikelyStaticHtmlResponse = (res: Response): boolean => {
  const contentType = (res.headers.get('content-type') || '').toLowerCase();
  const isHtmlResponse =
    contentType.includes('text/html') ||
    contentType.includes('application/xhtml+xml');
  if (!isHtmlResponse) {
    return false;
  }

  return true;
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
  const candidates = getApiCandidates();
  let lastResponse: Response | null = null;
  let lastError: Error | null = null;
  const trace: Array<{ base: string; ok: boolean; status?: number; error?: string }> = [];
  const debug = isApiDebugEnabled();
  const isProdLike = typeof window !== 'undefined' && window.location.hostname.includes('vercel.app');

  for (const base of candidates) {
    try {
      const res = await fetch(`${base}${path}`, init);
      const isStatic = isLikelyStaticHtmlResponse(res);
      trace.push({ base, ok: !isStatic, status: res.status });
      if (debug) {
        console.info('[picky] requestApi attempt', {
          path,
          base,
          status: res.status,
          static: isStatic,
        });
      }

      if (!isStatic || base === candidates[candidates.length - 1]) {
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

  if ((isProdLike || debug) && path === '/auth/guest') {
    console.info('[picky] requestApi trace', path, trace);
  }

  if (lastResponse) {
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
