/**
 * 오프라인/로컬 폴백 정책 — web/toss 두 앱이 **동일 기준**을 쓰도록 단일화한 곳.
 *
 * 배경(적대적 모순검토에서 적발):
 * - 웹은 투표 폴백에 환경 게이트가 없어 프로덕션 5xx/404에도 가짜 투표 성공(+1·confetti·hasVoted)
 *   을 만들어 '1인1표/집계'와 모순됐고, 토스는 생성 폴백이 무조건 true라 프로덕션에서도 유령 폴을
 *   만들어 죽은 공유 링크를 양산했다.
 * - 두 앱이 같은 로직을 따로 구현한 드리프트라, 정책을 여기 한 곳으로 모아 동시 해소한다.
 *
 * 규칙: 로컬 폴백(로컬 폴 생성 / 로컬 투표 반영)은 **개발/로컬 환경에서만** 허용한다.
 * 프로덕션 실패는 폴백으로 숨기지 않고 에러로 표면화한다. 단, 이미 만들어진 로컬 폴(`local-*`)에
 * 대한 후속 투표는 환경과 무관하게 로컬로 반영한다(서버에 존재하지 않는 폴이므로).
 */

/** 로컬 폴백을 허용해도 되는 환경인지(개발 빌드 또는 localhost 계열). */
export const isLocalPollFallbackAllowed = (): boolean => {
  // Vite/번들러 환경에서만 존재하는 import.meta.env 를 안전하게 읽는다.
  const env = (import.meta as unknown as { env?: Record<string, unknown> }).env;
  if (env?.VITE_ALLOW_LOCAL_POLL_FALLBACK === 'true') {
    return true;
  }
  if (env?.DEV) {
    return true;
  }

  if (!('window' in globalThis)) {
    return false;
  }

  const { hostname } = globalThis.location;
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname.endsWith('.local');
};

/** 로컬 폴백 후보가 되는 네트워크 상태(찾을 수 없음/메서드 불가/서버 오류). */
export const isRetryableLocalPollStatus = (status: number): boolean =>
  status === 404 || status === 405 || status >= 500;
