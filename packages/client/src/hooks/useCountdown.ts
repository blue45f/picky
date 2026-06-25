import { useEffect, useState } from 'react';
import { getRemainingMs } from '@picky/shared';

/**
 * 마감까지 남은 ms를 1초마다 갱신하는 공유 훅 — web/toss 두 앱이 함께 써요.
 * 마감 없음 → null. 부모가 이 값으로 `closed` 등 게이팅을 함께 파생하면
 * 카운트다운과 상태가 lockstep으로 전환돼요.
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
