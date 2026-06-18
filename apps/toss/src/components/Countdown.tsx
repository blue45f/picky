import { useEffect, useState } from 'react';
import { formatCountdown, getRemainingMs, isDeadlineSoon } from '../lib/format';
import { Chip } from './ui';

/** 마감까지 남은 ms를 1초마다 갱신. 마감 없음 → null. */
export function useCountdown(endsAt: string | null | undefined): number | null {
  const [remaining, setRemaining] = useState<number | null>(() => getRemainingMs(endsAt));

  useEffect(() => {
    setRemaining(getRemainingMs(endsAt));
    if (!endsAt) {
      return;
    }

    const tick = () => {
      const next = getRemainingMs(endsAt);
      setRemaining(next);
      return next;
    };

    const timer = window.setInterval(() => {
      const next = tick();
      if (next != null && next <= 0) {
        window.clearInterval(timer);
      }
    }, 1000);

    return () => window.clearInterval(timer);
  }, [endsAt]);

  return remaining;
}

/** 마감 카운트다운 배지. 진행중 마감이 있을 때만 렌더. */
export function CountdownChip({ endsAt }: { endsAt: string | null | undefined }) {
  const remaining = useCountdown(endsAt);
  if (remaining == null) {
    return null;
  }
  if (remaining <= 0) {
    return <Chip tone="muted">마감됨</Chip>;
  }
  const soon = isDeadlineSoon(endsAt);
  return <Chip tone={soon ? 'gold' : 'muted'}>⏳ {formatCountdown(remaining)} 남음</Chip>;
}
