import { useEffect, useState } from 'react';

/**
 * 마감까지 남은 ms. 마감 없음/무효 → null, 이미 지남 → 0.
 * @picky/shared 의 getRemainingMs 와 동일 구현이지만, 토스 `.ait` 번들러가 패키지명
 * (@picky/shared) 의 **런타임** import 를 처리하지 못해(collect-package-version 플러그인)
 * 훅은 자체 포함시켜요. 표시용 포맷(getRemainingMs/formatCountdown)은 각 앱이
 * @picky/shared(웹) / `../shared` 어댑터(토스) 로 가져다 써요.
 */
const computeRemainingMs = (endsAt: string | null | undefined): number | null => {
  if (!endsAt) {
    return null;
  }
  const target = new Date(endsAt).getTime();
  if (!Number.isFinite(target)) {
    return null;
  }
  return Math.max(0, target - Date.now());
};

/**
 * 마감까지 남은 ms를 1초마다 갱신하는 공유 훅 — web/toss 두 앱이 함께 써요.
 * 마감 없음 → null. 부모가 이 값으로 `closed` 등 게이팅을 함께 파생하면
 * 카운트다운과 상태가 lockstep으로 전환돼요.
 */
export function useCountdown(endsAt: string | null | undefined): number | null {
  const [remaining, setRemaining] = useState<number | null>(() => computeRemainingMs(endsAt));

  useEffect(() => {
    setRemaining(computeRemainingMs(endsAt));
    if (!endsAt) {
      return;
    }

    const timer = globalThis.setInterval(() => {
      const next = computeRemainingMs(endsAt);
      setRemaining(next);
      if (next != null && next <= 0) {
        globalThis.clearInterval(timer);
      }
    }, 1000);

    return () => globalThis.clearInterval(timer);
  }, [endsAt]);

  return remaining;
}
