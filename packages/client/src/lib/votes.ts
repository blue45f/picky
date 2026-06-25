/**
 * 기기 로컬 투표 기록 — web/toss 공통. 중복 투표 방지 + 참여 표시(결과 공개 게이트)용.
 * localStorage에 의존하므로 packages/shared가 아닌 client에 둔다.
 */

const votedKey = (pollId: string) => `picky_voted_${pollId}`;

/** 이 기기에서 해당 고민에 선택한 옵션 ID. 미투표면 null. */
export const getVotedOptionId = (pollId: string): number | null => {
  if (typeof localStorage === 'undefined') {
    return null;
  }
  const raw = localStorage.getItem(votedKey(pollId));
  const parsed = raw == null ? Number.NaN : Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
};

/** 이 기기에서 투표했는지. */
export const hasVotedLocally = (pollId: string): boolean => getVotedOptionId(pollId) != null;

/** 투표 결과를 기기에 기록. */
export const rememberVote = (pollId: string, optionId: number): void => {
  if (typeof localStorage === 'undefined') {
    return;
  }
  localStorage.setItem(votedKey(pollId), String(optionId));
};
