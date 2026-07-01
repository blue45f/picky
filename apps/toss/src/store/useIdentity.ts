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
  loginError: string | null;
  initialized: boolean;
  init: () => Promise<void>;
  login: () => Promise<boolean>;
  setDisplayName: (name: string) => void;
}

export const useIdentity = create<IdentityState>((set, get) => ({
  env: 'web',
  userKey: null,
  displayName: loadName(),
  loginError: null,
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
    set({ loginError: null });
    // 사용자가 명시적으로 누른 "토스로 로그인"은 반드시 appLogin 동의/인가 코드 흐름을 탄다.
    // getAnonymousKey 기반 식별 세션은 init()에서 데이터 귀속용으로만 만들며, 토스 계정
    // 로그인 성공으로 간주하지 않는다.
    const result = await useAuthStore.getState().loginWithTossAccount();
    const ok = result.ok;
    if (!ok) {
      set({ loginError: result.message ?? '토스 로그인에 실패했어요.' });
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
