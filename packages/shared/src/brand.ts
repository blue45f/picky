/**
 * 픽플로우 공유 브랜드 — 마스코트 "피키 🥑", 고민 카테고리, 친근한 말투를
 * web/toss 두 앱이 한 소스에서 공유한다.
 *
 * 순수 데이터만 둔다(React/DOM 의존 금지). 앱인토스 .ait 번들러가 workspace:* 를
 * 처리하지 못해 토스는 이 파일을 상대 경로로 직접 재수출하고, 웹은 @picky/shared 로
 * 가져간다 — 양쪽 모두 같은 "친근하고 귀여운" 결을 쓰게 하기 위함.
 */

/** 까다로운 고민을 함께 골라주는 브랜드 마스코트, 아보카도 "피키". */
export const MASCOT_NAME = '피키';
export const MASCOT_EMOJI = '🥑';

export type MascotMood = 'idle' | 'thinking' | 'celebrate' | 'empty' | 'sleeping' | 'curious';

export interface MascotFace {
  /** 아보카도에 표정·소품을 더한 이모지 묶음. */
  emoji: string;
  /** 상황에 맞춘 한 마디(친근체). */
  line: string;
}

/** 상황별 마스코트 표정 — 빈 화면, 로딩, 투표 완료 등에 일관되게 쓴다. */
export const MASCOT: Record<MascotMood, MascotFace> = {
  idle: { emoji: '🥑', line: '오늘은 무슨 고민이 있어요?' },
  thinking: { emoji: '🥑💭', line: '음… 같이 골라볼까요?' },
  celebrate: { emoji: '🥑🎉', line: '투표 완료! 골라줘서 고마워요' },
  empty: { emoji: '🥑', line: '아직 고민이 없어요. 첫 고민을 올려볼까요?' },
  sleeping: { emoji: '🥑💤', line: '여긴 아직 조용하네요' },
  curious: { emoji: '🥑👀', line: '결과가 궁금해요!' },
};

/** 고민 카테고리 메타 — id·라벨·이모지·파스텔 강조색(web·toss 공통). */
export interface PollCategoryMeta {
  id: string;
  label: string;
  emoji: string;
  /** 친근한 파스텔 강조색(hex). */
  color: string;
}

export const POLL_CATEGORIES: readonly PollCategoryMeta[] = [
  { id: 'life', label: '일상', emoji: '🍔', color: '#f6a560' },
  { id: 'work', label: '업무', emoji: '💼', color: '#13c2a3' },
  { id: 'education', label: '수업', emoji: '🎓', color: '#6c8cff' },
  { id: 'event', label: '모임', emoji: '🎉', color: '#f48fb1' },
  { id: 'product', label: '제품', emoji: '🛍️', color: '#b08cff' },
];

/** id 로 카테고리 메타를 찾는다(없으면 undefined). */
export function categoryMeta(id?: string | null): PollCategoryMeta | undefined {
  if (!id) return undefined;
  return POLL_CATEGORIES.find((category) => category.id === id);
}

/** 두 앱이 공유하는 친근한 마이크로카피 — 말투를 한 곳에서 통일한다. */
export const VOICE = {
  emptyPolls: '아직 고민이 없어요. 첫 고민을 올려볼까요? 🥑',
  loading: '고민을 가져오고 있어요… 🥑',
  voteSuccess: '투표 완료! 골라줘서 고마워요 🎉',
  sharePrompt: '친구에게 물어보기',
  deleteConfirm: '이 고민을 정말 지울까요? 🥺',
  scanHint: '카메라로 스캔하면 바로 참여할 수 있어요',
} as const;

/** 둥글고 말랑한 형태 기준 라운드 스케일(px) — web·toss 공통 참고값. */
export const RADIUS = { sm: 12, md: 18, lg: 24, pill: 999 } as const;
