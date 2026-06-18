import { create } from 'zustand';
import { getStableUserKey, getTossEnv, type TossEnv } from '../lib/toss';

const NAME_KEY = 'pickflow_display_name';

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
  },
  setDisplayName: (name: string) => {
    const trimmed = name.trim();
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(NAME_KEY, trimmed);
    }
    set({ displayName: trimmed });
  },
}));
