import { useEffect, useState } from 'react';

const DAY_MS = 24 * 60 * 60 * 1000;

/** 마감까지 남은 밀리초. 마감 없음/무효 → null, 이미 지남 → 0. */
function getRemainingMs(endsAt: string | null | undefined): number | null {
  if (!endsAt) {
    return null;
  }
  const target = new Date(endsAt).getTime();
  if (!Number.isFinite(target)) {
    return null;
  }
  return Math.max(0, target - Date.now());
}

/** 남은 시간(ms) → "2일 3시간" · "5시간 12분" · "12분 30초" · "마감". */
function formatCountdown(ms: number): string {
  if (ms <= 0) {
    return '마감';
  }

  const totalSec = Math.floor(ms / 1000);
  const day = Math.floor(totalSec / 86400);
  const hour = Math.floor((totalSec % 86400) / 3600);
  const min = Math.floor((totalSec % 3600) / 60);
  const sec = totalSec % 60;

  if (day > 0) return `${day}일 ${hour}시간`;
  if (hour > 0) return `${hour}시간 ${min}분`;
  if (min > 0) return `${min}분 ${sec}초`;
  return `${sec}초`;
}

/**
 * 마감까지 남은 ms를 1초마다 갱신. 마감 없음 → null.
 * 부모가 이 값으로 `closed` 등 게이팅을 함께 파생하면 카운트다운과 상태가 lockstep으로 전환돼요.
 */
export function useCountdown(endsAt: string | null | undefined): number | null {
  const [remaining, setRemaining] = useState<number | null>(() => getRemainingMs(endsAt));

  useEffect(() => {
    setRemaining(getRemainingMs(endsAt));
    if (!endsAt) {
      return;
    }

    const timer = globalThis.setInterval(() => {
      const next = getRemainingMs(endsAt);
      setRemaining(next);
      if (next != null && next <= 0) {
        globalThis.clearInterval(timer);
      }
    }, 1000);

    return () => globalThis.clearInterval(timer);
  }, [endsAt]);

  return remaining;
}

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

  const soon = remaining <= DAY_MS;
  return (
    <span style={{ ...chipBaseStyle, ...TONE_STYLE[soon ? 'gold' : 'muted'] }}>
      <span aria-hidden="true">⏳</span> {formatCountdown(remaining)} 남음
    </span>
  );
}
