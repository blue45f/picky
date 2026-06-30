import { create } from 'zustand';
import { getStableUserKey, getTossEnv, type TossEnv } from '../lib/toss';
import { useAuthStore } from './useAuthStore';
import { pingVisit } from '../lib/deskPlatform';

const NAME_KEY = 'picky_display_name';

const loadName = (): string => {
  if (typeof localStorage === 'undefined') {
    return '';
  }
  return localStorage.getItem(NAME_KEY)?.trim() || '';
};

interface IdentityState {
  env: TossEnv;
  /** 비게임 미니앱 사용자 식별키 (getAnonymousKey hash). 없으면 null. */
  userKey: string | null;
  /** 투표자/작성자 표시 이름. */
  displayName: string;
  initialized: boolean;
  init: () => Promise<void>;
  login: () => Promise<boolean>;
  setDisplayName: (name: string) => void;
}

export const useIdentity = create<IdentityState>((set, get) => ({
  env: 'web',
  userKey: null,
  displayName: loadName(),
  initialized: false,
  init: async () => {
    if (get().initialized) {
      return;
    }
    const env = getTossEnv();
    const userKey = await getStableUserKey();
    set({ env, userKey, initialized: true });

    // desk-platform 방문 집계(공개·키 불필요, 웹과 동일 appId). 실패는 조용히 무시.
    void pingVisit();

    // 토스 환경: 식별키로 서버 세션을 발급받아 작성/투표를 안정적 사용자에 귀속.
    if (userKey) {
      const ok = await useAuthStore
        .getState()
        .loginWithToss(userKey, get().displayName || undefined);
      if (ok) {
        const profile = useAuthStore.getState().user;
        if (profile?.nickname && !get().displayName) {
          set({ displayName: profile.nickname });
        }
      }
    }
  },
  login: async () => {
    const userKey = await getStableUserKey();
    let ok = false;
    if (userKey) {
      ok = await useAuthStore.getState().loginWithToss(userKey, get().displayName || undefined);
    }
    if (!ok) {
      const result = await useAuthStore.getState().loginWithTossAccount();
      ok = result.ok;
    }
    if (ok) {
      const profile = useAuthStore.getState().user;
      if (profile?.nickname) {
        set({ displayName: profile.nickname });
        const trimmed = profile.nickname.trim();
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem(NAME_KEY, trimmed);
        }
      }
    }
    return ok;
  },
  setDisplayName: (name: string) => {
    const trimmed = name.trim();
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(NAME_KEY, trimmed);
    }
    set({ displayName: trimmed });
  },
}));
