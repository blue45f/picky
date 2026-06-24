import { useEffect, useRef } from 'react';
import { getBannerAdGroupId, useTossBanner } from '../lib/ads';
import { isInToss } from '../lib/toss';

/**
 * 앱인토스 인앱 배너 광고 슬롯.
 * 정책 준수: 토스 밖/미지원/광고그룹 미설정이면 아무것도 렌더하지 않아요(빈 슬롯·레이아웃 깨짐 방지).
 * 첫 화면 진입 직후가 아니라 콘텐츠 하단(스크롤 아래)에 배치해 주세요. 컨테이너는 width 100% · height 96px.
 */
export function BannerAd() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { ready, attach } = useTossBanner();
  const adGroupId = getBannerAdGroupId();

  useEffect(() => {
    if (!ready || !adGroupId || !containerRef.current) {
      return;
    }
    const attached = attach(adGroupId, containerRef.current, {
      theme: 'dark', // 피키는 다크 테마 고정
      tone: 'blackAndWhite',
      variant: 'card', // 좌우 패딩 + border-radius로 카드 리스트에 자연스럽게
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
      aria-hidden
      style={{ width: '100%', height: 96, margin: '6px 0 14px' }}
    />
  );
}
