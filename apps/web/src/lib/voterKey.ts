/**
 * 서버측 1인1표(#12)용 안정 식별키.
 * 이 브라우저에 영속하는 익명 키를 localStorage에 한 번 만들어 재사용한다(개인정보 아님).
 */

const VOTER_KEY_STORAGE_KEY = 'picky_voter_key'; // gitleaks:allow — localStorage 키(비밀 아님)

const randomKey = (): string => {
  try {
    return globalThis.crypto.randomUUID();
  } catch {
    // 구형 환경 폴백 — 충돌 가능성 극히 낮은 의사난수.
    return `vk-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  }
};

/**
 * 이 기기/브라우저의 안정 voterKey를 반환한다(없으면 생성·저장).
 * localStorage 미지원 환경(SSR 등)에서는 null을 반환해 미전송 폴백한다.
 */
export const getVoterKey = (): string | null => {
  if (typeof localStorage === 'undefined') {
    return null;
  }

  try {
    const existing = localStorage.getItem(VOTER_KEY_STORAGE_KEY)?.trim();
    if (existing) {
      return existing;
    }

    const next = randomKey();
    localStorage.setItem(VOTER_KEY_STORAGE_KEY, next);
    return next;
  } catch {
    return null;
  }
};
