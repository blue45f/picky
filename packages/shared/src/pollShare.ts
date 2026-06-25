/**
 * 공유 텍스트·오리진 정규화 코어 — web/toss 두 앱의 lib/pollShare.ts 가 같은 문구·정규화 규약을
 * 쓰도록 단일화한 순수 모듈. DOM/SDK/env 에 의존하지 않는다.
 *
 * 주의: 오리진을 "어떻게 고를지"(resolvePollShareUrl·getShareOrigin)는 앱별 본질 차이라 여기 두지 않는다.
 * - web: 스냅샷/share-origin(VITE_SHARE_BASE_URL 우선) 기반 공개 웹 URL
 * - toss: 토스 딥링크(getTossShareLink) 우선, 밖에선 공개 웹 오리진으로 폴백
 * 그 분기는 각 앱의 lib/pollShare.ts 에 남기고, 여기서는 공통 빌딩블록만 제공한다.
 */
import type { Poll } from './index';

/** 공유 메시지 접두어 — web/toss 동일. */
export const SHARE_PREFIX = '[피키 투표] ';

/** 투표 공유 본문(접두어 + 질문 + 참여 유도). 링크는 호출부에서 덧붙인다. */
export const resolveShareText = (poll: Poll): string =>
  `${SHARE_PREFIX}${poll.question}\n\n결정에 참여하고 의견을 남겨주세요.`;

/** 끝의 슬래시(/) 들을 모두 제거. 오리진 정규화의 전처리. */
export const trimTrailingSlashes = (value: string): string => {
  let end = value.length;
  while (end > 0 && value.codePointAt(end - 1) === 47) {
    end -= 1;
  }
  return end === value.length ? value : value.slice(0, end);
};

/**
 * 오리진 후보 문자열을 정규화 — 빈 값/무효면 null.
 * 프로토콜이 없으면 https:// 를 붙이고, URL.origin 으로 좁힌다.
 */
export const normalizeOrigin = (value: string | null | undefined): string | null => {
  const trimmed = value ? trimTrailingSlashes(value.trim()) : '';
  if (!trimmed) {
    return null;
  }
  const withProtocol =
    trimmed.startsWith('http://') || trimmed.startsWith('https://')
      ? trimmed
      : `https://${trimmed}`;
  try {
    return new URL(withProtocol).origin;
  } catch {
    return null;
  }
};

/**
 * 외부(토스 밖)에서도 열리는 공개 웹 오리진인지.
 * localhost/127.0.0.1 과 토스 미니앱 WebView 호스트(*.tossmini.com)는 공유 대상이 아니다.
 */
export const isPublicWebHost = (origin: string): boolean => {
  try {
    const { hostname } = new URL(origin);
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return false;
    }
    if (hostname.endsWith('.tossmini.com')) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
};
