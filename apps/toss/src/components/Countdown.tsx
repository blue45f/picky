import { formatCountdown } from '../lib/format';
import { CLOSING_SOON_MS } from '../shared';
import { Chip } from './ui';

// useCountdown 훅은 packages/client 로 단일화했어요(웹과 동일 구현).
export { useCountdown } from '../../../../packages/client/src/hooks/useCountdown';

/**
 * 마감 카운트다운 배지. 부모가 틱하는 `remaining`을 받아 표시만 해요(자체 타이머 없음).
 * 마감 없음/경과 시 null을 반환하므로 '진행중/마감' 상태 배지와 모순되지 않아요.
 * '마감 임박' 강조(gold) 기준은 @picky/shared 의 CLOSING_SOON_MS(24h) 로 단일화했어요.
 */
export function CountdownChip({ remaining }: Readonly<{ remaining: number | null }>) {
  if (remaining == null || remaining <= 0) {
    return null;
  }
  const soon = remaining <= CLOSING_SOON_MS;
  return <Chip tone={soon ? 'gold' : 'muted'}>⏳ {formatCountdown(remaining)} 남음</Chip>;
}
