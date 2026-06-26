/**
 * 앱인토스 WebView 브릿지 래퍼.
 * 토스 환경이 아닐 때(일반 브라우저/개발)도 안전하게 폴백하도록 모두 try/catch로 감싸요.
 */
import {
  appLogin,
  generateHapticFeedback,
  getAnonymousKey,
  getOperationalEnvironment,
  getSchemeUri,
  getTossShareLink,
  requestReview,
  share,
  type HapticFeedbackType,
} from '@apps-in-toss/web-framework';

export type TossEnv = 'toss' | 'sandbox' | 'web';

/** 'toss'(실기기/앱) | 'sandbox'(샌드박스) | 'web'(브릿지 없음). */
export function getTossEnv(): TossEnv {
  try {
    return getOperationalEnvironment();
  } catch {
    return 'web';
  }
}

export const isInToss = (): boolean => getTossEnv() !== 'web';

/**
 * 토스 미니앱으로 열리는 공유 링크(https) 생성.
 * `intoss://picky/...` 딥링크를 토스앱이 여는 링크로 변환해요(미설치 시 앱/플레이스토어 이동).
 * 토스 밖이거나 미지원·오류면 null을 반환 → 호출부가 공개 웹 URL로 폴백해요.
 * 주의: `intoss://` 스킴은 미니앱이 정식 출시된 이후에만 실제로 열려요(출시 전엔 테스트 스킴 사용).
 */
export async function buildTossShareLink(
  path: string,
  ogImageUrl?: string,
): Promise<string | null> {
  if (!isInToss()) {
    return null;
  }
  try {
    const link = await getTossShareLink(path, ogImageUrl);
    return typeof link === 'string' && link.length > 0 ? link : null;
  } catch {
    return null;
  }
}

/**
 * 비게임 미니앱 사용자 식별키(hash). 서버/동의 없이 미니앱 내 고유 사용자 식별.
 * 샌드박스에서는 mock, 미지원/실패 시 null.
 */
export async function getStableUserKey(): Promise<string | null> {
  try {
    const result = await getAnonymousKey();
    if (result && typeof result === 'object' && result.type === 'HASH') {
      return result.hash;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * 토스 로그인 인가 코드 획득. 토큰 교환/사용자 조회는 서버에서 처리해야 해요(mTLS).
 * 인가 코드는 10분 유효·일회성.
 */
export async function tossAppLogin(): Promise<{
  authorizationCode: string;
  referrer: 'DEFAULT' | 'SANDBOX';
} | null> {
  try {
    const result = await appLogin();
    return result ?? null;
  } catch {
    return null;
  }
}

/**
 * 옵트인 '토스 프로필 불러오기' 기능 활성 여부.
 * web-framework v3에서 SDK API(`getConsentedUserData`)가 제거됐어요(레거시 bedrock 전용).
 * v3에 다시 노출되기 전까지는 기능을 끄고(false) 항상 숨겨요. 콘솔 '유저정보 불러오기'
 * 설정 자체는 그대로 유지되니, API가 복원되면 이 함수와 아래 fetch만 되살리면 돼요.
 */
export const isConsentedProfileEnabled = (): boolean => false;

/**
 * 토스 동의 기반 사용자 정보(이름/이메일) 옵트인 조회.
 * v3 web-framework에는 해당 SDK API가 없어 항상 null을 반환해요(기능 비활성).
 * 호출부는 null을 안전 폴백으로 처리하므로 동작이 깨지지 않아요.
 */
export async function fetchConsentedProfile(): Promise<{
  name?: string;
  email?: string;
} | null> {
  return null;
}

export type { HapticFeedbackType };

/**
 * 네이티브 햅틱 진동. 토스 밖(브라우저/개발)에서는 조용히 무시돼요.
 * 선택/투표/성공/오류 등 인터랙션 피드백에 사용해요.
 */
export function hapticFeedback(type: HapticFeedbackType): void {
  if (!isInToss()) {
    return;
  }
  try {
    generateHapticFeedback({ type }).catch(() => {
      // 미지원 디바이스/환경은 조용히 무시
    });
  } catch {
    // 미지원 디바이스/환경은 조용히 무시
  }
}

/**
 * 토스 네이티브 미니앱 리뷰 요청 시트. 지원·토스 환경에서만 동작.
 * @returns 요청을 띄웠는지 여부
 */
export async function requestAppReview(): Promise<boolean> {
  if (!isInToss()) {
    return false;
  }
  try {
    if (typeof requestReview.isSupported === 'function' && !requestReview.isSupported()) {
      return false;
    }
    await requestReview();
    return true;
  } catch {
    return false;
  }
}

/** 이 미니앱으로 돌아오는 딥링크 스킴(intoss://picky ...). */
export function getMiniAppSchemeUri(): string | null {
  try {
    return getSchemeUri();
  } catch {
    return null;
  }
}

const trimTrailingSlashes = (value: string): string => {
  let end = value.length;
  while (end > 0 && value.codePointAt(end - 1) === 47) {
    end -= 1;
  }
  return end === value.length ? value : value.slice(0, end);
};

const isAllowedPollId = (value: string): boolean => {
  if (!value) {
    return false;
  }

  for (const char of value) {
    const code = char.codePointAt(0) ?? 0;
    const isUppercase = code >= 65 && code <= 90;
    const isLowercase = code >= 97 && code <= 122;
    const isDigit = code >= 48 && code <= 57;
    if (!isUppercase && !isLowercase && !isDigit && char !== '_' && char !== '-') {
      return false;
    }
  }

  return true;
};

/**
 * 진입 스킴(intoss://picky/poll/<id> 등)을 앱 내부 경로로 해석.
 * 딥링크로 들어왔을 때 해당 투표/작성 화면으로 바로 이동시키기 위한 화이트리스트 파서.
 * @returns 안전한 내부 경로(`/poll/:id` · `/create`) 또는 null
 */
export function parseEntryRoute(): string | null {
  const uri = getMiniAppSchemeUri();
  if (!uri) {
    return null;
  }
  let path: string;
  try {
    path = trimTrailingSlashes(new URL(uri).pathname);
  } catch {
    return null;
  }

  const pollPrefix = '/poll/';
  if (path.startsWith(pollPrefix) && isAllowedPollId(path.slice(pollPrefix.length))) {
    return path;
  }
  if (path === '/create') {
    return path;
  }
  return null;
}

/**
 * 메시지 공유. 토스 네이티브 공유 → navigator.share → 클립보드 순으로 폴백.
 * @returns 공유/복사 성공 여부
 */
export async function shareMessage(
  message: string,
): Promise<'toss' | 'web-share' | 'clipboard' | null> {
  if (isInToss()) {
    try {
      await share({ message });
      return 'toss';
    } catch {
      // fall through to web fallbacks
    }
  }

  try {
    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      await navigator.share({ text: message });
      return 'web-share';
    }
  } catch {
    return null; // 사용자가 공유 시트를 닫은 경우 등
  }

  try {
    await navigator.clipboard.writeText(message);
    return 'clipboard';
  } catch {
    return null;
  }
}
