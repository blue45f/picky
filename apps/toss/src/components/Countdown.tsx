import { useEffect, useState } from 'react';
import { formatCountdown, getRemainingMs } from '../lib/format';
import { Chip } from './ui';

const DAY_MS = 24 * 60 * 60 * 1000;

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

    const timer = window.setInterval(() => {
      const next = getRemainingMs(endsAt);
      setRemaining(next);
      if (next != null && next <= 0) {
        window.clearInterval(timer);
      }
    }, 1000);

    return () => window.clearInterval(timer);
  }, [endsAt]);

  return remaining;
}

/**
 * 마감 카운트다운 배지. 부모가 틱하는 `remaining`을 받아 표시만 해요(자체 타이머 없음).
 * 마감 없음/경과 시 null을 반환하므로 '진행중/마감' 상태 배지와 모순되지 않아요.
 */
export function CountdownChip({ remaining }: { remaining: number | null }) {
  if (remaining == null || remaining <= 0) {
    return null;
  }
  const soon = remaining <= DAY_MS;
  return <Chip tone={soon ? 'gold' : 'muted'}>⏳ {formatCountdown(remaining)} 남음</Chip>;
}
