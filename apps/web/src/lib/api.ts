const normalizeApiBase = (rawBase: string): string => {
  const trimmed = rawBase.trim().replace(/\/+$/, '');
  if (!trimmed) {
    return trimmed;
  }

  if (trimmed.startsWith('/')) {
    return trimmed === '/' ? '/api' : trimmed;
  }

  try {
    const parsed = new URL(trimmed);
    const hasRootPath = !parsed.pathname || parsed.pathname === '/';
    if (hasRootPath) {
      return `${parsed.origin}/api`;
    }

    return `${parsed.origin}${parsed.pathname}`;
  } catch {
    return trimmed;
  }
};

export const getApiBaseUrl = (): string => {
  const explicitBase = import.meta.env.VITE_API_BASE_URL?.trim();
  if (explicitBase) {
    return normalizeApiBase(explicitBase);
  }

  if (typeof window === 'undefined') {
    return '/api';
  }

  const { protocol, host } = window.location;
  return `${protocol}//${host}/api`.replace(/\/$/, '');
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
