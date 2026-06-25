import { useEffect, useRef, useState } from 'react';
import { type AdFormat, getBannerAdGroupId, useTossBanner } from '../lib/ads';
import { isInToss } from '../lib/toss';

type BannerAdProps = Readonly<{
  /**
   * 광고 형태.
   * - `banner`(기본): 가로로 긴 리스트형 표준 배너 — 본문/목록 사이에 자연스러워요.
   * - `feed`: 피드형(네이티브 이미지) — 카드 목록 사이에 끼울 때 어울려요.
   */
  format?: AdFormat;
  /** 위/아래 여백(px). 인접 콘텐츠와의 간격을 호출부에서 조절해요. */
  gap?: number;
}>;

/**
 * 앱인토스 인앱 배너 광고 슬롯.
 *
 * 정책(토스 애즈 SSP) 준수:
 * - 토스 밖/미지원/광고그룹 미설정이면 아무것도 렌더하지 않아요(빈 슬롯·레이아웃 깨짐 방지).
 * - 광고를 못 채우면(`onNoFill`)/렌더 실패하면(`onAdFailedToRender`) 슬롯을 접어요(빈 공간 방지).
 * - 첫 화면 진입 직후(ATF)나 핵심 액션(투표/제출 버튼) 위가 아니라, 콘텐츠가 끝나는
 *   자연스러운 지점에 배치해야 해요. 광고를 가리거나 다른 요소로 덮지 않아요.
 * - SDK 기본 클릭·노출·라벨('ad' 표기)을 변조하지 않아요(`variant`/`theme`만 프리셋 사용).
 *
 * 컨테이너 규격: width 100% · height 96px(고정형).
 */
export function BannerAd({ format = 'banner', gap = 14 }: BannerAdProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { ready, attach } = useTossBanner();
  const adGroupId = getBannerAdGroupId(format);
  // 광고를 못 채우거나 렌더에 실패하면 슬롯을 접어 빈 공간을 남기지 않아요.
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    if (!ready || !adGroupId || !containerRef.current) {
      return;
    }
    const attached = attach(adGroupId, containerRef.current, {
      theme: 'dark', // 피키는 다크 테마 고정(앱 분위기 일치)
      tone: 'blackAndWhite',
      variant: 'card', // 좌우 패딩 + border-radius로 카드 리스트에 자연스럽게
      callbacks: {
        // 채울 광고가 없거나 렌더에 실패하면 슬롯을 접어요(빈 96px 공간 방지).
        onNoFill: () => setCollapsed(true),
        onAdFailedToRender: () => setCollapsed(true),
        // 다시 채워지면 슬롯을 복구해요(visibility 복귀 시 SDK가 자동 갱신).
        onAdRendered: () => setCollapsed(false),
      },
    });
    return () => {
      attached?.destroy();
    };
  }, [ready, adGroupId, attach]);

  // 토스 밖이거나 광고를 띄울 수 없는 환경이면 렌더하지 않아요.
  if (!isInToss() || !adGroupId) {
    return null;
  }

  return (
    <div
      ref={containerRef}
      // 광고 콘텐츠(SDK가 'ad' 라벨 포함해 렌더)는 우리 a11y 트리 밖의 서드파티 영역이라 숨겨요.
      aria-hidden
      style={{
        width: '100%',
        height: collapsed ? 0 : 96,
        margin: collapsed ? 0 : `6px 0 ${gap}px`,
        overflow: 'hidden',
        transition: 'height 0.2s ease',
      }}
    />
  );
}
