import { create } from 'zustand';
import type {
  UserProfile,
  RegisterInput,
  LoginInput,
  GuestRegisterInput,
  AuthResult,
} from '../shared';
import { parseApiPayload, requestApi } from '../lib/api';

interface AuthState {
  user: UserProfile | null;
  token: string | null;
  guestName: string;
  isLoading: boolean;
  error: string | null;
  validationErrors: Record<string, string>;
  needsReauth: boolean;

  register: (input: RegisterInput) => Promise<boolean>;
  login: (input: LoginInput) => Promise<boolean>;
  registerGuest: (input: GuestRegisterInput) => Promise<boolean>;
  logout: () => void;
  fetchMe: () => Promise<void>;
  setGuestName: (name: string) => void;
  clearError: () => void;
  clearValidationErrors: () => void;
  setNeedsReauth: (nextNeedsReauth: boolean) => void;
  invalidateSession: (message: string) => void;
}

const USER_STORAGE_KEY = 'picky_user';

const normalizeUser = (candidate: any): UserProfile | null => {
  if (!candidate || typeof candidate !== 'object') {
    return null;
  }

  if (!candidate.id || !candidate.nickname) {
    return null;
  }

  return {
    id: String(candidate.id),
    email: typeof candidate.email === 'string' ? candidate.email : '',
    nickname: String(candidate.nickname),
    createdAt:
      typeof candidate.createdAt === 'string' ? candidate.createdAt : new Date().toISOString(),
    isGuest: Boolean(candidate.isGuest),
  };
};

const loadSavedUser = (): UserProfile | null => {
  if (typeof localStorage === 'undefined') {
    return null;
  }

  const raw = localStorage.getItem(USER_STORAGE_KEY);
  if (!raw) {
    return null;
  }

  try {
    return normalizeUser(JSON.parse(raw));
  } catch {
    localStorage.removeItem(USER_STORAGE_KEY);
    return null;
  }
};

const persistUser = (user: UserProfile | null) => {
  if (!user) {
    localStorage.removeItem(USER_STORAGE_KEY);
    return;
  }

  localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
};

const resolveAuthErrorMessage = (payload: any, fallback: string): string => {
  if (!payload) {
    return fallback;
  }

  if (typeof payload?.message === 'string') {
    return payload.message;
  }

  if (Array.isArray(payload?.message)) {
    const message = payload.message
      .map((item: any) => (typeof item === 'string' ? item : item?.message))
      .filter((item: any) => typeof item === 'string')
      .join(', ');

    if (message) {
      return message;
    }
  }

  if (Array.isArray(payload?.errors) && payload.errors.length > 0) {
    return payload.errors[0]?.message || fallback;
  }

  return fallback;
};

const decodeAuthToken = (token: string | null): UserProfile | null => {
  if (!token) {
    return null;
  }

  try {
    const base64Payload = token.split('.')[1];
    if (!base64Payload) {
      return null;
    }

    const normalizedPayload = base64Payload.replace(/-/g, '+').replace(/_/g, '/');
    const paddedPayload = `${normalizedPayload}${'='.repeat((4 - (normalizedPayload.length % 4)) % 4)}`;

    const decodedPayload = decodeURIComponent(
      atob(paddedPayload)
        .split('')
        .map((character) => {
          const hex = character.charCodeAt(0).toString(16).padStart(2, '0');
          return `%${hex}`;
        })
        .join(''),
    );

    const decoded = JSON.parse(decodedPayload);
    if (typeof decoded?.sub !== 'string' || typeof decoded?.nickname !== 'string') {
      return null;
    }

    return {
      id: decoded.sub,
      email: typeof decoded.email === 'string' ? decoded.email : '',
      nickname: decoded.nickname || '',
      createdAt: new Date().toISOString(),
      isGuest: Boolean(decoded.isGuest),
    };
  } catch {
    return null;
  }
};

const resolveAuthFieldErrors = (payload: any): Record<string, string> => {
  if (!Array.isArray(payload?.errors)) {
    return {};
  }

  return payload.errors.reduce((next: Record<string, string>, item: any) => {
    if (!item || typeof item.message !== 'string') {
      return next;
    }

    const path = Array.isArray(item.path)
      ? item.path.filter((part: any) => typeof part === 'string' || typeof part === 'number')
      : undefined;

    const leafField =
      Array.isArray(path) && path.length > 0
        ? path[path.length - 1]
        : typeof item.path === 'string'
          ? item.path
          : undefined;

    const rawKey =
      typeof leafField === 'string' || typeof leafField === 'number' ? String(leafField) : 'root';

    const key = rawKey === 'name' ? 'nickname' : rawKey;

    if (!next[key]) {
      next[key] = item.message;
    }

    return next;
  }, {});
};

const isAuthResultPayload = (payload: any): payload is AuthResult => {
  return (
    Boolean(payload) &&
    typeof payload.accessToken === 'string' &&
    payload.accessToken.trim() !== '' &&
    payload.user &&
    typeof payload.user === 'object' &&
    typeof payload.user.id === 'string' &&
    payload.user.id.trim() !== '' &&
    typeof payload.user.nickname === 'string'
  );
};

const hydrate = (set: any, data: AuthResult) => {
  if (!data?.accessToken || !data?.user) {
    return false;
  }

  const user = normalizeUser(data.user);
  if (!user) {
    return false;
  }

  localStorage.setItem('picky_token', data.accessToken);
  localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
  set({
    user,
    token: data.accessToken,
  });
  return true;
};

const normalizeAuthFailure = async (res: Response, fallback: string) => {
  const payload = await parseApiPayload(res);
  const validationErrors = resolveAuthFieldErrors(payload);
  const message = resolveAuthErrorMessage(payload, validationErrors.root || fallback);

  return { payload, validationErrors, message };
};

const commitAuthSuccess = (set: any, data: AuthResult) => {
  hydrate(set, data);

  const resolvedUser = normalizeUser(data.user);
  if (!resolvedUser) {
    return false;
  }

  localStorage.setItem('picky_token', data.accessToken);
  persistUser(resolvedUser);

  set({
    user: resolvedUser,
    token: data.accessToken,
    needsReauth: false,
    isLoading: false,
    validationErrors: {},
  });

  return true;
};

export const useAuthStore = create<AuthState>((set, get) => {
  const token = localStorage.getItem('picky_token');
  const guestName = localStorage.getItem('picky_guest_name') || '';
  const savedUser = token ? loadSavedUser() : null;

  return {
    user: savedUser,
    token,
    guestName,
    isLoading: false,
    error: null,
    validationErrors: {},
    needsReauth: false,

    register: async (input) => {
      set({ isLoading: true, error: null, validationErrors: {} });
      try {
        const payload = {
          email: input.email.trim().toLowerCase(),
          password: input.password,
          nickname: input.nickname.trim(),
        };

        const res = await requestApi('/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        const data = (await parseApiPayload(res)) as AuthResult;
        if (!res.ok) {
          const { validationErrors, message } = await normalizeAuthFailure(
            res,
            '회원가입에 실패했습니다.',
          );
          set({
            error: message,
            validationErrors,
            isLoading: false,
          });
          return false;
        }

        if (!isAuthResultPayload(data) || !commitAuthSuccess(set, data)) {
          throw new Error(resolveAuthErrorMessage(data, '인증 응답 형식이 올바르지 않습니다.'));
        }

        localStorage.removeItem('picky_guest_name');
        set({
          guestName: '',
          isLoading: false,
          validationErrors: {},
        });
        return true;
      } catch (err: any) {
        set({
          error: err.message || '회원가입에 실패했습니다.',
          isLoading: false,
          validationErrors: {},
        });
        return false;
      }
    },

    login: async (input) => {
      set({ isLoading: true, error: null, validationErrors: {} });
      try {
        const payload = {
          email: input.email.trim().toLowerCase(),
          password: input.password,
        };
        const res = await requestApi('/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        const data = (await parseApiPayload(res)) as AuthResult;
        if (!res.ok) {
          const { validationErrors, message } = await normalizeAuthFailure(
            res,
            '로그인에 실패했습니다.',
          );
          set({
            error: message,
            validationErrors,
            isLoading: false,
          });
          return false;
        }

        if (!isAuthResultPayload(data) || !commitAuthSuccess(set, data)) {
          throw new Error(resolveAuthErrorMessage(data, '인증 응답 형식이 올바르지 않습니다.'));
        }

        localStorage.removeItem('picky_guest_name');
        set({
          guestName: '',
          isLoading: false,
          validationErrors: {},
        });
        return true;
      } catch (err: any) {
        set({
          error: err.message || '로그인에 실패했습니다.',
          isLoading: false,
          validationErrors: {},
        });
        return false;
      }
    },

    registerGuest: async (input) => {
      set({ isLoading: true, error: null, validationErrors: {} });
      try {
        const payload = {
          nickname: input.nickname.trim(),
        };
        const res = await requestApi('/auth/guest', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        const data = (await parseApiPayload(res)) as AuthResult;
        if (!res.ok) {
          const { validationErrors, message } = await normalizeAuthFailure(
            res,
            '비회원 등록에 실패했습니다.',
          );
          set({
            error: message,
            validationErrors,
            isLoading: false,
          });
          return false;
        }

        if (!isAuthResultPayload(data) || !commitAuthSuccess(set, data)) {
          throw new Error(resolveAuthErrorMessage(data, '인증 응답 형식이 올바르지 않습니다.'));
        }

        localStorage.setItem('picky_guest_name', payload.nickname);
        set({
          guestName: payload.nickname,
          isLoading: false,
          validationErrors: {},
        });
        return true;
      } catch (err: any) {
        set({
          error: err.message || '비회원 등록에 실패했습니다.',
          isLoading: false,
          validationErrors: {},
        });
        return false;
      }
    },

    logout: () => {
      localStorage.removeItem('picky_token');
      localStorage.removeItem('picky_guest_name');
      persistUser(null);
      set({
        user: null,
        token: null,
        guestName: '',
        error: null,
        validationErrors: {},
        needsReauth: false,
      });
    },

    fetchMe: async () => {
      const { token } = get();
      if (!token) return;

      set({ isLoading: true, error: null, validationErrors: {} });
      try {
        const res = await requestApi('/auth/me', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!res.ok) {
          const fallbackUser = decodeAuthToken(token);
          if (fallbackUser && res.status === 401) {
            persistUser(fallbackUser);
            set({
              user: fallbackUser,
              isLoading: false,
              needsReauth: false,
              validationErrors: {},
            });
            return;
          }

          localStorage.removeItem('picky_token');
          persistUser(null);
          const nextError =
            res.status === 401
              ? '로그인 세션이 만료되었거나 유효하지 않습니다. 다시 로그인해 주세요.'
              : '내 정보를 가져오는데 실패했습니다.';

          set({
            user: null,
            token: null,
            error: nextError,
            isLoading: false,
            needsReauth: res.status === 401,
            validationErrors: {},
          });
          return;
        }

        const user = (await parseApiPayload(res)) as UserProfile | null;
        if (!user || !user.id) {
          localStorage.removeItem('picky_token');
          persistUser(null);
          set({
            user: null,
            token: null,
            isLoading: false,
            error: '세션이 유효하지 않습니다. 다시 로그인해 주세요.',
            needsReauth: true,
            validationErrors: {},
          });
          return;
        }

        persistUser(user);
        set({ user, isLoading: false, needsReauth: false, validationErrors: {} });
      } catch (err: any) {
        set({
          error: err.message || '내 정보를 가져오는데 실패했습니다.',
          isLoading: false,
          needsReauth: false,
          validationErrors: {},
        });
      }
    },

    setGuestName: (name: string) => {
      localStorage.setItem('picky_guest_name', name);
      set({ guestName: name });
    },

    clearError: () => set({ error: null }),
    clearValidationErrors: () => set({ validationErrors: {} }),
    setNeedsReauth: (nextNeedsReauth: boolean) => set({ needsReauth: nextNeedsReauth }),
    invalidateSession: (message: string) => {
      localStorage.removeItem('picky_token');
      persistUser(null);
      set({
        user: null,
        token: null,
        error: message,
        isLoading: false,
        needsReauth: true,
        validationErrors: {},
      });
    },
  };
});
