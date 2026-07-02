/**
 * 응원 부스트 — 보상형 광고 옵트인 퍼크(결과 화면 전용).
 *
 * 규약(공식 통합 광고 정책):
 * - 사전 로드(load→'loaded')된 광고만 show — 버튼 클릭 시 load+show 동시 금지.
 * - 보상 지급은 `userEarnedReward` 이벤트에서만(dismissed 만으로는 지급 금지) —
 *   이 계약은 useRewardedPerks(lib/ads)가 강제해요.
 * - 광고 그룹 미설정(운영 env 없음)·미지원 환경이면 카드 자체를 렌더하지 않아요.
 * - "광고 클릭 즉시 보상" 구조 금지 — 보상은 클릭이 아니라 '시청 완료'에만 연결돼요.
 *
 * 보상은 서버가 필요 없는 로컬 연출: 폴별 응원 부스트 카운트(localStorage) +
 * 화려한 파티클 샤워 + 응원 배지. BGM 일시정지/재개는 ads.ts 가 광고 수명주기에서 처리해요.
 */
import { useState } from 'react';
import { theme, FONT } from '../theme';
import { hapticFeedback } from '../lib/toss';
import { triggerParticleBurst } from '../lib/particles';
import type { RewardedPerks } from '../lib/ads';

const boostStorageKey = (pollId: string) => `picky_boost_${pollId}`;

const readBoostCount = (pollId: string): number => {
  if (typeof localStorage === 'undefined') return 0;
  try {
    const parsed = Number.parseInt(localStorage.getItem(boostStorageKey(pollId)) ?? '0', 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
  } catch {
    return 0;
  }
};

const writeBoostCount = (pollId: string, count: number): void => {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(boostStorageKey(pollId), String(count));
  } catch {
    // 무시(프라이빗 모드 등).
  }
};

/** 시청 완료 순간의 파티클 샤워 — 화면 곳곳에서 3연타로 터지는 축하 연출. */
const celebrateBoost = (): void => {
  const w = globalThis.innerWidth;
  const h = globalThis.innerHeight;
  const bursts: Array<{ x: number; y: number; delay: number }> = [
    { x: w / 2, y: h * 0.35, delay: 0 },
    { x: w * 0.25, y: h * 0.55, delay: 180 },
    { x: w * 0.75, y: h * 0.5, delay: 340 },
  ];
  bursts.forEach(({ x, y, delay }) => {
    globalThis.setTimeout(() => {
      triggerParticleBurst(x, y, {
        count: 36,
        charSet: ['🥑', '🎉', '💛', '✨', '🌟', '💚', '🎊'],
        speedMultiplier: 1.5,
      });
    }, delay);
  });
};

type CheerBoostCardProps = Readonly<{
  pollId: string;
  /** 화면 단위로 공유하는 보상형 광고 컨트롤러(useRewardedPerks). */
  rewarded: RewardedPerks;
}>;

/** 투표 결과 화면의 "광고 보고 응원 부스트" 옵트인 카드. */
export function CheerBoostCard({ pollId, rewarded }: CheerBoostCardProps) {
  const [boostCount, setBoostCount] = useState(() => readBoostCount(pollId));
  const [justBoosted, setJustBoosted] = useState(false);
  const [showing, setShowing] = useState(false);

  // 광고를 띄울 수 없는 환경(운영 env 미설정·SDK 미지원·토스 밖)이면 아무것도 렌더하지 않는다.
  if (!rewarded.available) {
    return null;
  }

  const handleBoost = () => {
    if (!rewarded.ready || showing) return;
    hapticFeedback('tap');
    setShowing(true);
    const shown = rewarded.showFor((reward) => {
      // userEarnedReward 에서만 도달 — 여기서만 보상(카운트+연출)을 지급한다.
      setBoostCount((prev: number) => {
        const next = prev + Math.max(1, reward.unitAmount);
        writeBoostCount(pollId, next);
        return next;
      });
      setJustBoosted(true);
      hapticFeedback('confetti');
      celebrateBoost();
      globalThis.setTimeout(() => setJustBoosted(false), 4000);
      setShowing(false);
    });
    if (!shown) {
      setShowing(false);
    } else {
      // dismissed(보상 없이 닫힘) 대비 — 광고 종료 후 버튼을 다시 활성화한다.
      globalThis.setTimeout(() => setShowing(false), 1500);
    }
  };

  return (
    <section
      className="rise"
      aria-label="응원 부스트"
      style={{
        marginTop: 14,
        padding: '16px 16px',
        borderRadius: theme.radius,
        background: `linear-gradient(135deg, ${theme.surface} 0%, rgba(244,197,96,0.07) 100%)`,
        border: `1px solid ${justBoosted ? theme.gold : theme.border}`,
        boxShadow: justBoosted
          ? '0 8px 28px rgba(244, 197, 96, 0.25)'
          : '0 4px 16px rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,0.03)',
        transition: 'border-color 0.4s ease, box-shadow 0.4s ease',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <span aria-hidden style={{ fontSize: 26, flexShrink: 0 }} className="pf-mascot-bob">
          📣
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: FONT.bodyLg, fontWeight: 800, color: theme.text }}>
            응원 부스트
            {boostCount > 0 ? (
              <span
                style={{
                  marginLeft: 8,
                  fontSize: FONT.caption,
                  fontWeight: 800,
                  color: theme.gold,
                  background: theme.goldSoft,
                  padding: '2px 8px',
                  borderRadius: theme.radiusPill,
                }}
              >
                ×{boostCount}
              </span>
            ) : null}
          </div>
          <div
            style={{
              fontSize: FONT.small,
              color: theme.textMuted,
              marginTop: 2,
              lineHeight: 1.5,
              wordBreak: 'keep-all',
            }}
          >
            {justBoosted
              ? '응원 부스트 발동! 이 고민에 힘이 실렸어요 🎉'
              : '광고를 끝까지 보면 이 고민에 응원 배지를 남길 수 있어요.'}
          </div>
        </div>
      </div>

      <button
        type="button"
        className="pressable sheen"
        onClick={handleBoost}
        disabled={!rewarded.ready || showing}
        style={{
          marginTop: 12,
          width: '100%',
          minHeight: 46,
          borderRadius: 14,
          border: `1px solid ${theme.gold}55`,
          background: rewarded.ready && !showing ? theme.goldSoft : 'rgba(255,255,255,0.04)',
          color: rewarded.ready && !showing ? theme.gold : theme.textFaint,
          fontSize: FONT.body,
          fontWeight: 800,
          cursor: rewarded.ready && !showing ? 'pointer' : 'default',
        }}
      >
        {showing ? '광고 재생 중…' : rewarded.ready ? '광고 보고 응원 부스트 🎉' : '광고 준비 중…'}
      </button>
    </section>
  );
}
