export const getApiBaseUrl = (): string => {
  const explicitBase = import.meta.env.VITE_API_BASE_URL?.trim();
  if (explicitBase) {
    return explicitBase.replace(/\/$/, '');
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
    if (!text) {
      return {
        message: `${res.status} ${res.statusText} (${res.url})`,
      };
    }

    const textValue = text.trim();
    if (!textValue) {
      return {
        message: `${res.status} ${res.statusText} (${res.url})`,
      };
    }

    if (textValue.startsWith('{') || textValue.startsWith('[')) {
      try {
        return JSON.parse(textValue);
      } catch {
        // keep raw message below
      }
    }

    return {
      message: `${res.status} ${res.statusText} (${res.url})`,
      error: textValue.slice(0, 180),
    };
  } catch {
    return {
      message: `${res.status} ${res.statusText} (${res.url})`,
    };
  }
};
