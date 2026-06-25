/**
 * 토스 Analytics(핵심지표) 행동 로깅 래퍼 — apps/toss 전용.
 *
 * 앱인토스 웹 프레임워크의 `Analytics`(screen/impression/click)를 감싸요.
 * - 토스 밖(일반 브라우저/개발)·미지원·오류면 조용히 no-op (try/catch + isInToss 가드).
 * - 라이브 환경에서만 실제 수집돼요(샌드박스/QR 테스트는 미수집 — 토스 공식 정책).
 * - 핵심 이벤트만 로깅: 앱 열기·투표·한마디·고민 작성·공유.
 *
 * 개인정보 미수집 원칙: 이벤트명 + 비식별 카운트/구분값만 보내요.
 * voterKey·닉네임·질문 텍스트·접근 코드 등 식별 가능한 값은 절대 넣지 않아요.
 */
import { Analytics } from '@apps-in-toss/web-framework';
import { isInToss } from './toss';

/** 비식별 이벤트 파라미터(원시값만). 식별자/자유 텍스트는 호출부에서 넣지 마세요. */
export type AnalyticsParams = Record<string, string | number | boolean>;

/** 핵심 이벤트명 — 콘솔 분석에서 이 이름으로 집계돼요. */
export type AnalyticsEvent = 'app_open' | 'vote' | 'comment' | 'create_poll' | 'share';

/**
 * 단일 이벤트 로깅 진입점. 토스 밖/미지원/오류면 조용히 무시해요(절대 throw 안 함).
 * 웹 프레임워크 `Analytics.click`을 범용 인터랙션 로거로 사용하고,
 * 이벤트 식별은 `log_name`으로 넘겨요.
 */
export function logEvent(name: AnalyticsEvent, params?: AnalyticsParams): void {
  if (!isInToss()) {
    return;
  }
  try {
    const result = Analytics.click({ log_name: name, ...params });
    // click는 Promise를 돌려줄 수 있어요 — 수집 실패가 흐름을 막지 않도록 흡수해요.
    if (result && typeof result.then === 'function') {
      result.catch(() => {
        // 수집 실패는 무시(사용자 흐름에 영향 없음)
      });
    }
  } catch {
    // 미지원 환경/SDK 버전·브릿지 부재 등은 조용히 무시
  }
}

/** 앱(미니앱) 진입. App.tsx 마운트 시 1회. */
export const trackAppOpen = (): void => logEvent('app_open');

/** 투표 완료. 식별값 없이 선택지 개수만 비식별 컨텍스트로 첨부. */
export const trackVote = (optionCount?: number): void =>
  logEvent('vote', typeof optionCount === 'number' ? { option_count: optionCount } : undefined);

/** 한마디(댓글/답글) 작성. reply 여부만 비식별 컨텍스트로 첨부. */
export const trackComment = (isReply = false): void => logEvent('comment', { is_reply: isReply });

/** 고민(투표) 작성 완료. 공개 범위만 비식별 컨텍스트로 첨부(public/unlisted/private). */
export const trackCreatePoll = (visibility?: string): void =>
  logEvent('create_poll', visibility ? { visibility } : undefined);

/** 공유 실행. 공유 방식(toss/web-share/clipboard)만 비식별 컨텍스트로 첨부. */
export const trackShare = (method?: string): void =>
  logEvent('share', method ? { method } : undefined);
