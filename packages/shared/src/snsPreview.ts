/**
 * SNS 공유 프리뷰 콘텐츠 — 작성 중인 투표(질문/설명/선택지/이미지)를 X·카카오 공유 카드에
 * 들어갈 텍스트/메타로 환산하는 순수 로직. UI(카드 레이아웃/색)는 앱별, 콘텐츠는 공유한다.
 */

/** SNS 프리뷰 입력(작성 폼 상태). */
export interface SnsPreviewInput {
  question: string;
  description?: string | null;
  /** 선택지 텍스트 배열(빈 문자열은 표시에서 제외). */
  options: string[];
  imageUrl?: string | null;
}

/** SNS 프리뷰 콘텐츠 모델 — 카드에 렌더할 텍스트/메타. */
export interface SnsPreviewContent {
  /** 카드 제목(질문, 비면 placeholder). */
  title: string;
  /** 요약(설명 우선, 없으면 상위 선택지 나열). */
  summary: string;
  /** 카드에 노출할 선택지(최대 3개). */
  visibleOptions: string[];
  /** 숨겨진 선택지 수(+N). */
  hiddenOptionCount: number;
  /** 질문+선택지 2개 이상이면 공유 준비 완료. */
  previewReady: boolean;
  /** 이미지 프리뷰 포함 여부. */
  hasImagePreview: boolean;
  /** 읽는 데 걸리는 예상 시간(초). */
  estimatedSeconds: number;
  /** 카드 하단 메타 칩(상태/선택지수/이미지/예상시간). */
  metaItems: string[];
}

const VISIBLE_OPTION_LIMIT = 3;
const READING_CHARS_PER_SECOND = 16;
const MIN_ESTIMATED_SECONDS = 5;

/**
 * 작성 중인 투표로부터 SNS 공유 카드 콘텐츠를 만든다(SnsPreviewCard 동일 산출).
 * 플랫폼(X/카카오) 분기는 하지 않는다 — 메타/텍스트는 동일, 레이아웃만 앱별.
 */
export const buildSnsPreviewContent = (input: SnsPreviewInput): SnsPreviewContent => {
  const { question, description, options, imageUrl } = input;
  const trimmedQuestion = question.trim();
  const title = trimmedQuestion || '공유될 투표 질문';
  const summary =
    description?.trim() ||
    (options.length > 0
      ? options
          .slice(0, VISIBLE_OPTION_LIMIT)
          .map((option, index) => `${index + 1}. ${option}`)
          .join(' · ')
      : '링크를 받은 사람이 바로 선택할 수 있는 투표 카드가 표시됩니다.');
  const visibleOptions = options.filter(Boolean).slice(0, VISIBLE_OPTION_LIMIT);
  const hiddenOptionCount = Math.max(options.length - visibleOptions.length, 0);
  const previewReady = trimmedQuestion.length > 0 && options.length >= 2;
  const readableCharacterCount =
    title.length +
    summary.length +
    visibleOptions.reduce((total, option) => total + option.length, 0);
  const estimatedSeconds = Math.max(
    MIN_ESTIMATED_SECONDS,
    Math.ceil(readableCharacterCount / READING_CHARS_PER_SECOND),
  );
  const hasImagePreview = Boolean(imageUrl);
  const metaItems = [
    previewReady ? '참여 가능' : '작성 중',
    `${options.length}개 선택지`,
    hasImagePreview ? '이미지 반영' : '기본 이미지',
    `${estimatedSeconds}초 예상`,
  ];

  return {
    title,
    summary,
    visibleOptions,
    hiddenOptionCount,
    previewReady,
    hasImagePreview,
    estimatedSeconds,
    metaItems,
  };
};
