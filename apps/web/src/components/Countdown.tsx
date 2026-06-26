import { CLOSING_SOON_MS, formatCountdown } from '@picky/shared';

// 카운트다운 순수 헬퍼(getRemainingMs/formatCountdown)와 useCountdown 훅은 공유 패키지로 단일화했어요.
// 마감 임박(24h) 임계값도 @picky/shared CLOSING_SOON_MS 단일 소스를 쓴다(시그널 칩과 동일 기준).
export { useCountdown } from '../../../../packages/client/src/hooks/useCountdown';

const chipBaseStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '4px',
  fontSize: '0.66rem',
  fontWeight: 800,
  padding: '2px 9px',
  borderRadius: '999px',
  border: '1px solid',
  whiteSpace: 'nowrap',
};

const TONE_STYLE: Record<'gold' | 'muted', React.CSSProperties> = {
  gold: {
    color: 'var(--brand-accent-gold)',
    borderColor: 'rgba(250, 204, 21, 0.32)',
    background: 'rgba(250, 204, 21, 0.09)',
  },
  muted: {
    color: 'var(--text-muted)',
    borderColor: 'var(--bg-card-border)',
    background: 'rgba(255, 255, 255, 0.03)',
  },
};

/**
 * 마감 카운트다운 배지. 부모가 틱하는 `remaining`을 받아 표시만 해요(자체 타이머 없음).
 * 마감 없음/경과 시 마감 후 정적 '마감됨' 배지(closedFallback)로 폴백하고,
 * 진행 중이면 24시간 이내는 골드 톤으로 강조해요.
 */
export function CountdownChip({
  remaining,
  closedFallback = false,
}: Readonly<{ remaining: number | null; closedFallback?: boolean }>) {
  if (remaining == null) {
    return null;
  }

  if (remaining <= 0) {
    if (!closedFallback) {
      return null;
    }
    return (
      <span style={{ ...chipBaseStyle, ...TONE_STYLE.muted }}>
        <span aria-hidden="true">⏰</span> 마감됨
      </span>
    );
  }

  const soon = remaining <= CLOSING_SOON_MS;
  return (
    <span style={{ ...chipBaseStyle, ...TONE_STYLE[soon ? 'gold' : 'muted'] }}>
      <span aria-hidden="true">⏳</span> {formatCountdown(remaining)} 남음
    </span>
  );
}
