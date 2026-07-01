import {
  TossAds,
  type TossAdsAttachBannerOptions,
  loadFullScreenAd,
  showFullScreenAd,
} from '@apps-in-toss/web-framework';
import { useCallback, useEffect, useState, useRef } from 'react';
import { getAudioContext, isBgmEnabled, bgmPlay, bgmPause } from './sound';

/**
 * 앱인토스 인앱 배너 광고 헬퍼.
 * 정책: 개발 단계는 테스트 광고 ID만 사용, 운영은 콘솔에서 발급한 광고 그룹 ID를 주입해요.
 * 외부 광고 네트워크는 금지(앱인토스 광고만 허용). 토스 밖/미지원 환경에서는 안전하게 no-op.
 *
 * 용어: 여기서 다루는 건 전부 '배너 광고'예요. SDK에는 광고 타입 구분이 없고,
 * 슬롯 종류(일반 배너 / 피드형 배너 등)는 콘솔 광고 그룹(adGroupId)이 결정해요.
 */

// WebView 배너 테스트 ID(공식 문서). 실제 광고 ID로 테스트하면 정책 위반이라 dev 전용.
//
// 중요: SDK(attachBanner)에는 'feed'/'native' 같은 광고 타입 구분이 없어요.
// 슬롯 종류는 전적으로 콘솔의 광고 그룹(adGroupId)이 결정해요. 아래 'feed'는
// 별도 광고 타입이 아니라, 콘솔에서 만든 '배너(피드형)' 그룹을 가리키는
// 우리 코드의 배치/렌더 위치 라벨일 뿐이에요(둘 다 '배너 광고').
// - banner: 목록/본문 사이에 두는 일반 배너 그룹
// - feed:   카드 목록 사이에 끼우려고 콘솔에서 '배너(피드형)'로 만든 그룹
//           (전용 그룹이 없으면 일반 배너 그룹으로 폴백 → 동일하게 동작)
const TEST_BANNER_AD_GROUP_ID = 'ait-ad-test-banner-id';
// 공식 WebView 배너 가이드는 현재 리스트형 테스트 ID 하나만 제공한다.
const TEST_FEED_AD_GROUP_ID = TEST_BANNER_AD_GROUP_ID;

/**
 * 배너 광고 배치 위치 라벨(슬롯 종류 X, 광고 타입 X).
 * 어느 콘솔 광고 그룹 ID를 쓸지 고르는 키일 뿐 — 둘 다 '배너 광고'예요.
 * 운영 광고 그룹 ID를 배치별로 분리 주입할 수 있어요.
 */
export type AdFormat = 'banner' | 'feed';

/**
 * 노출할 배너 광고 그룹 ID.
 * - 운영: 배치별 콘솔 발급값(`VITE_TOSS_AD_GROUP_ID` / `VITE_TOSS_FEED_AD_GROUP_ID`)
 *   - `feed`는 콘솔에서 '배너(피드형)'로 만든 그룹 ID를 넣어야 해요(별도 광고 타입 아님).
 *   - 'feed' 전용 값이 없으면 일반 배너 값으로 폴백(둘 다 없으면 미노출).
 * - 개발: 배치별 테스트 ID
 * - 그 외(운영인데 미설정): null → 광고 미노출(빈 슬롯 방지)
 */
export function getBannerAdGroupId(format: AdFormat = 'banner'): string | null {
  const banner = import.meta.env.VITE_TOSS_AD_GROUP_ID?.trim();
  const feed = import.meta.env.VITE_TOSS_FEED_AD_GROUP_ID?.trim();
  if (format === 'feed') {
    if (feed) {
      return feed;
    }
    if (banner) {
      return banner;
    }
    return import.meta.env.DEV ? TEST_FEED_AD_GROUP_ID : null;
  }
  if (banner) {
    return banner;
  }
  return import.meta.env.DEV ? TEST_BANNER_AD_GROUP_ID : null;
}

// SDK는 앱 전체에서 한 번만 초기화(중복 초기화 금지) — 모듈 스코프로 상태 공유.
let sdkInitialized = false;
let sdkInitializing = false;

function isAdsSupported(): boolean {
  try {
    return Boolean(TossAds?.initialize?.isSupported?.());
  } catch {
    return false;
  }
}

/**
 * TossAds 초기화 + 배너 부착 헬퍼 훅.
 * @returns ready(초기화 완료), attach(배너 부착 — 반환 객체의 destroy()로 정리)
 */
export function useTossBanner() {
  const [ready, setReady] = useState(sdkInitialized);

  useEffect(() => {
    if (sdkInitialized) {
      setReady(true);
      return;
    }
    if (sdkInitializing || !isAdsSupported()) {
      return;
    }
    sdkInitializing = true;
    try {
      TossAds.initialize({
        callbacks: {
          onInitialized: () => {
            sdkInitialized = true;
            sdkInitializing = false;
            setReady(true);
          },
          onInitializationFailed: () => {
            sdkInitializing = false;
          },
        },
      });
    } catch {
      sdkInitializing = false;
    }
  }, []);

  const attach = useCallback(
    (adGroupId: string, element: HTMLElement, options?: TossAdsAttachBannerOptions) => {
      if (!ready) {
        return undefined;
      }
      try {
        return TossAds.attachBanner(adGroupId, element, options);
      } catch {
        return undefined;
      }
    },
    [ready],
  );

  return { ready, attach, supported: isAdsSupported() };
}

export type FullScreenAdFormat = 'interstitial' | 'rewarded';

/** 전면/보상형 광고 그룹 ID를 가져와요. */
export function getFullScreenAdGroupId(format: FullScreenAdFormat): string | null {
  const value =
    format === 'rewarded'
      ? import.meta.env.VITE_TOSS_REWARDED_AD_GROUP_ID
      : import.meta.env.VITE_TOSS_INTERSTITIAL_AD_GROUP_ID;
  if (value?.trim()) return value.trim();
  // 공식 문서의 테스트 ID 사용
  return import.meta.env.DEV ? 'ait.dev.43daa14da3ae487b' : null;
}

function isFullScreenAdSupported(): boolean {
  try {
    return Boolean(loadFullScreenAd.isSupported() && showFullScreenAd.isSupported());
  } catch {
    return false;
  }
}

let pausedForAd = false;
let bgmWasPlayingBeforeAd = false;

function pauseAudioForAd(): void {
  if (pausedForAd) return;
  pausedForAd = true;

  bgmWasPlayingBeforeAd = isBgmEnabled();
  if (bgmWasPlayingBeforeAd) {
    bgmPause();
  }

  const ctx = getAudioContext();
  if (ctx && ctx.state === 'running') {
    void ctx.suspend().catch(() => {});
  }
}

function resumeAudioAfterAd(): void {
  if (!pausedForAd) return;
  pausedForAd = false;

  const ctx = getAudioContext();
  if (ctx && ctx.state === 'suspended') {
    void ctx
      .resume()
      .then(() => {
        if (bgmWasPlayingBeforeAd) {
          bgmPlay();
        }
      })
      .catch(() => {
        if (bgmWasPlayingBeforeAd) {
          bgmPlay();
        }
      });
  } else {
    if (bgmWasPlayingBeforeAd) {
      bgmPlay();
    }
  }
}

type FullScreenAdCallbacks = Readonly<{
  onReward?: (reward: { unitType: string; unitAmount: number }) => void;
  onError?: (error: Error) => void;
}>;

function toError(error: unknown): Error {
  return error instanceof Error ? error : new Error(String(error));
}

/** 통합 광고 전면/보상형 훅 */
export function useTossFullScreenAd(
  format: FullScreenAdFormat,
  callbacks: FullScreenAdCallbacks = {},
) {
  const adGroupId = getFullScreenAdGroupId(format);
  const supported = isFullScreenAdSupported();
  const [ready, setReady] = useState(false);
  const loadUnregisterRef = useRef<(() => void) | null>(null);
  const showUnregisterRef = useRef<(() => void) | null>(null);
  const loadRef = useRef<() => void>(() => undefined);
  const onRewardRef = useRef(callbacks.onReward);
  const onErrorRef = useRef(callbacks.onError);

  onRewardRef.current = callbacks.onReward;
  onErrorRef.current = callbacks.onError;

  const unregisterLoad = () => {
    loadUnregisterRef.current?.();
    loadUnregisterRef.current = null;
  };

  const unregisterShow = () => {
    showUnregisterRef.current?.();
    showUnregisterRef.current = null;
  };

  loadRef.current = () => {
    unregisterLoad();
    setReady(false);
    if (!adGroupId || !supported) return;

    try {
      loadUnregisterRef.current = loadFullScreenAd({
        options: { adGroupId },
        onEvent: ({ type }) => {
          if (type !== 'loaded') return;
          unregisterLoad();
          setReady(true);
        },
        onError: (error) => {
          unregisterLoad();
          setReady(false);
          onErrorRef.current?.(toError(error));
        },
      });
    } catch (error) {
      setReady(false);
      onErrorRef.current?.(toError(error));
    }
  };

  useEffect(() => {
    loadRef.current();
    return () => {
      unregisterLoad();
      unregisterShow();
    };
  }, [adGroupId, supported]);

  const show = (): boolean => {
    if (!ready || !adGroupId || !supported) return false;

    unregisterShow();
    setReady(false);
    let finished = false;
    const finishAndReload = () => {
      if (finished) return;
      finished = true;
      unregisterShow();
      resumeAudioAfterAd();
      loadRef.current();
    };

    try {
      pauseAudioForAd();
      showUnregisterRef.current = showFullScreenAd({
        options: { adGroupId },
        onEvent: (event) => {
          if (event.type === 'userEarnedReward') {
            onRewardRef.current?.(event.data);
          }
          if (event.type === 'dismissed' || event.type === 'failedToShow') {
            finishAndReload();
          }
        },
        onError: (error) => {
          onErrorRef.current?.(toError(error));
          finishAndReload();
        },
      });
      return true;
    } catch (error) {
      onErrorRef.current?.(toError(error));
      finishAndReload();
      return false;
    }
  };

  return {
    configured: Boolean(adGroupId),
    ready,
    reload: () => loadRef.current(),
    show,
    supported,
  };
}
