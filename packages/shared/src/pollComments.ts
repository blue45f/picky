/**
 * 한마디(댓글) 보기 모드 — 정렬(최신/선택지별/핵심)·선택지별 필터를 적용해 표시용 댓글 목록과
 * 선택지 필터 옵션을 만드는 순수 로직. web/toss 두 앱이 같은 정렬·필터·빈 상태 문구를 쓰도록
 * 단일화해요(과거엔 web 전용 인라인 로직, toss엔 정렬/필터 자체가 없었음).
 *
 * 반환하는 visibleComments 는 답글(대댓글)을 포함한 "전체 정렬본"이에요 — 호출부가
 * parentId 로 최상위/답글을 갈라 트리로 렌더해요(web/toss 공통 렌더 규약).
 */
import type { Poll, PollComment } from './index';

export const COMMENT_VIEW_OPTIONS = [
  { value: 'latest', label: '최신순' },
  { value: 'byOption', label: '선택지별' },
  { value: 'highlights', label: '핵심 의견' },
] as const;

export type CommentViewMode = (typeof COMMENT_VIEW_OPTIONS)[number]['value'];

/** 선택지별 필터 값 — 특정 옵션 id 또는 전체('all'). */
export type CommentFilter = number | 'all';

export interface CommentFilterOption {
  id: number;
  label: string;
  count: number;
}

export interface CommentViews {
  /** 선택지별 필터 칩(각 선택지에 연결된 한마디 수 포함). */
  commentFilterOptions: CommentFilterOption[];
  /** 필터·정렬이 적용된 표시용 댓글(답글 포함). */
  visibleComments: PollComment[];
  /** 표시할 댓글이 없을 때 안내 문구(보기 모드/필터별). */
  emptyCommentMessage: string;
}

/** '핵심 의견' 모드에서 노출할 최대 개수. */
export const COMMENT_HIGHLIGHT_LIMIT = 5;

const matchesOption = (
  comment: PollComment,
  optionId: number,
  optionText: string | undefined,
): boolean =>
  comment.selectedOptionId === optionId ||
  (optionText !== undefined && comment.selectedOptionText === optionText);

/**
 * 댓글에 정렬/필터를 적용해 표시용 목록을 만든다(web 기존 buildCommentViews 와 동일 규약).
 * - latest: 최신순
 * - byOption: 선택지명 가나다순 → 같은 선택지 안에선 최신순
 * - highlights: 본문이 긴 순 → 동률은 최신순, 상위 5개만
 */
export const buildCommentViews = (args: {
  poll: Poll;
  commentFilter: CommentFilter;
  commentViewMode: CommentViewMode;
}): CommentViews => {
  const { poll, commentFilter, commentViewMode } = args;
  const comments = poll.comments ?? [];

  const commentFilterOptions: CommentFilterOption[] = poll.options.map((option) => ({
    id: option.id,
    label: option.text,
    count: comments.filter((comment) => matchesOption(comment, option.id, option.text)).length,
  }));

  const targetOption =
    commentFilter === 'all' ? null : poll.options.find((option) => option.id === commentFilter);
  const filteredComments =
    commentFilter === 'all'
      ? comments
      : comments.filter((comment) => matchesOption(comment, commentFilter, targetOption?.text));

  const displayedComments = [...filteredComments].sort((a, b) => {
    if (commentViewMode === 'byOption') {
      const optionCompare = (a.selectedOptionText || '').localeCompare(
        b.selectedOptionText || '',
        'ko-KR',
      );
      if (optionCompare !== 0) {
        return optionCompare;
      }
    }
    if (commentViewMode === 'highlights') {
      const lengthCompare = b.comment.trim().length - a.comment.trim().length;
      if (lengthCompare !== 0) {
        return lengthCompare;
      }
    }
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  const visibleComments =
    commentViewMode === 'highlights'
      ? displayedComments.slice(0, COMMENT_HIGHLIGHT_LIMIT)
      : displayedComments;

  let emptyCommentMessage = '선택한 항목에 연결된 한마디가 없어요.';
  if (commentViewMode === 'highlights') {
    emptyCommentMessage = '핵심 의견으로 보여줄 한마디가 없어요.';
  } else if (commentFilter === 'all') {
    emptyCommentMessage = '아직 표시할 한마디가 없어요.';
  }

  return { commentFilterOptions, visibleComments, emptyCommentMessage };
};
