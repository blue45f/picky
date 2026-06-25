/**
 * "내 댓글" 추적 + 댓글 관리 권한 판정 — web/toss 공통(단일 소스).
 *
 * 왜 localStorage 추적인가:
 * 서버는 댓글 작성자 식별값(authorId/authorKey)을 **응답에 노출하지 않는다**(비밀 — voterKey와 동급).
 * 그래서 프론트는 "방금 내가 단 댓글"을 응답의 댓글 id로 직접 기억해 둔다(votes.ts 패턴과 동일).
 * 회원이든 비회원이든 같은 기기에서는 이 기록으로 본인 댓글을 알아본다(수정/삭제 버튼 노출용).
 *
 * 보안 모델: 프론트는 버튼을 "노출"만 하고, 실제 권한은 서버가 강제한다.
 * 삭제/수정 요청 시 voterKey를 POST/PATCH 바디로 보내면 서버가 authorKey/authorId와 대조해
 * (본인 OR 폴 소유자 OR 어드민)일 때만 통과시킨다. 기록이 조작돼도 서버에서 거부된다.
 */

const MY_COMMENTS_KEY = 'picky_my_comments_v1';
/** 기기당 추적할 최대 내 댓글 수(오래된 것부터 버림 — localStorage 비대화 방지). */
const MAX_TRACKED = 500;

interface MyCommentsMap {
  [pollId: string]: number[];
}

const readMap = (): MyCommentsMap => {
  if (typeof localStorage === 'undefined') {
    return {};
  }
  try {
    const raw = localStorage.getItem(MY_COMMENTS_KEY);
    if (!raw) {
      return {};
    }
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return {};
    }
    const next: MyCommentsMap = {};
    for (const [pollId, ids] of Object.entries(parsed as Record<string, unknown>)) {
      if (Array.isArray(ids)) {
        next[pollId] = ids.filter((value): value is number => typeof value === 'number');
      }
    }
    return next;
  } catch {
    return {};
  }
};

const writeMap = (map: MyCommentsMap) => {
  if (typeof localStorage === 'undefined') {
    return;
  }
  try {
    // 전체 추적 수가 상한을 넘으면 가장 오래된 폴 버킷부터 비운다(삽입 순서 = 오래된 순).
    let total = 0;
    for (const ids of Object.values(map)) {
      total += ids.length;
    }
    let trimmed: MyCommentsMap = map;
    if (total > MAX_TRACKED) {
      trimmed = {};
      let budget = MAX_TRACKED;
      // 최근 폴(뒤쪽)을 우선 보존하기 위해 역순으로 채운다.
      for (const [pollId, ids] of Object.entries(map).reverse()) {
        if (budget <= 0) break;
        const slice = ids.slice(Math.max(0, ids.length - budget));
        if (slice.length) {
          trimmed[pollId] = slice;
          budget -= slice.length;
        }
      }
    }
    localStorage.setItem(MY_COMMENTS_KEY, JSON.stringify(trimmed));
  } catch {
    // intentionally ignore (quota/SSR)
  }
};

/** 이 기기에서 해당 고민에 내가 남긴 댓글 id 목록. */
export const getMyCommentIds = (pollId: string): number[] => {
  if (!pollId) {
    return [];
  }
  return readMap()[pollId] ?? [];
};

/** 댓글 id가 이 기기에서 내가 남긴 것인지. */
export const isMyComment = (pollId: string, commentId: number): boolean =>
  getMyCommentIds(pollId).includes(commentId);

/** 내가 남긴 댓글 id를 기기에 기록(중복 제거). */
export const rememberMyComment = (pollId: string, commentId: number): void => {
  if (!pollId || typeof commentId !== 'number' || !Number.isFinite(commentId)) {
    return;
  }
  const map = readMap();
  const existing = map[pollId] ?? [];
  if (existing.includes(commentId)) {
    return;
  }
  map[pollId] = [...existing, commentId];
  writeMap(map);
};

/** 삭제된 댓글 id를 기기 기록에서 제거(낙관적 정리). */
export const forgetMyComment = (pollId: string, commentId: number): void => {
  const map = readMap();
  const existing = map[pollId];
  if (!existing) {
    return;
  }
  const next = existing.filter((value) => value !== commentId);
  if (next.length) {
    map[pollId] = next;
  } else {
    delete map[pollId];
  }
  writeMap(map);
};

/**
 * addComment/vote 응답(Poll)과 직전 댓글 id 스냅샷을 비교해, 새로 생긴 댓글들을 "내 것"으로 기록한다.
 * 서버가 작성자 식별값을 응답에 안 주므로(비밀), "제출 직후 늘어난 댓글 = 내가 단 것"으로 추론한다.
 * 멱등 처리(직전과 같은 한마디)로 새 댓글이 안 생기면 변화가 없어 아무것도 기록하지 않는다.
 */
export const rememberNewCommentsFromSnapshot = (
  pollId: string,
  previousIds: ReadonlySet<number>,
  comments: ReadonlyArray<{ id: number }>,
): void => {
  for (const comment of comments) {
    if (!previousIds.has(comment.id)) {
      rememberMyComment(pollId, comment.id);
    }
  }
};

/**
 * 댓글에 수정/삭제 버튼을 노출할지(프론트 UI 한정). 서버가 최종 권한을 강제하므로 여기선 보수적으로 넓게 허용 가능.
 * - 본인: 이 기기에서 내가 남긴 댓글(mine)
 * - 모더레이션: 폴 소유자(isPollOwner) 또는 어드민(isAdmin)
 */
export const canManageComment = (params: {
  mine: boolean;
  isPollOwner: boolean;
  isAdmin: boolean;
}): boolean => params.mine || params.isPollOwner || params.isAdmin;
