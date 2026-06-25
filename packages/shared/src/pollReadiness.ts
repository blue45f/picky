/**
 * 작성 준비도 채점 — web/toss 두 앱이 공유하는 순수 채점 로직.
 * 질문 명확성 · 선택지(중복/개수) · 결정 맥락(배경 설명) 3개 항목을 점검해 0~100 점수를 내요.
 * **안내 전용**: 작성/제출을 막지 않아요(강제 게이팅 금지).
 *
 * 항목 라벨/임계값/통과 판정은 두 앱이 동일하고, 안내 문구(help)만 앱별로 살짝 달라요.
 * 그래서 문구는 `copy`로 주입받아 덮어쓰되, 미지정 시 기본 문구를 써요(로직은 단일화).
 */

export interface ReadinessItem {
  label: string;
  passed: boolean;
  help: string;
}

export interface ReadinessResult {
  items: ReadinessItem[];
  score: number;
}

interface ReadinessInput {
  question: string;
  description: string;
  /** 선택지 텍스트 배열(빈 칸 포함 가능 — 내부에서 trim/필터). */
  optionTexts: string[];
  /** 참고 자료 첨부 개수(없으면 0). */
  attachmentCount?: number;
}

/** 앱별 안내 문구 커스터마이즈(미지정 항목은 기본 문구 사용). */
export interface ReadinessCopy {
  questionShort?: string;
  questionLong?: string;
  questionOk?: string;
  optionDuplicate?: string;
  optionTooMany?: string;
  optionTooFew?: string;
  optionOk?: string;
  contextOk?: string;
  contextMissing?: string;
}

export const MIN_QUESTION_LEN = 8;
export const MAX_QUESTION_LEN = 90;
export const MIN_OPTIONS = 2;
export const MAX_OPTIONS = 6;
export const MIN_CONTEXT_LEN = 20;

const DEFAULT_COPY: Required<ReadinessCopy> = {
  questionShort: '질문이 짧아 맥락을 이해하기 어려울 수 있어요.',
  questionLong: '모바일에서 질문이 길게 느껴질 수 있어요.',
  questionOk: '첫 화면에서 바로 이해할 수 있는 길이예요.',
  optionDuplicate: '중복 선택지가 있어 참여자가 헷갈릴 수 있어요.',
  optionTooMany: '선택지가 많아 즉시 응답에는 부담이 될 수 있어요.',
  optionTooFew: '선택지를 2개 이상 채워야 투표를 만들 수 있어요.',
  optionOk: '선택지를 빠르게 비교할 수 있어요.',
  contextOk: '배경 설명이 있어 판단 근거가 충분해요.',
  contextMissing: '왜 투표하는지 한 줄 배경을 더하면 응답 품질이 좋아져요.',
};

/** 질문/선택지/맥락 3항목을 채점한 준비도 결과. */
export const evaluatePollReadiness = (
  input: ReadinessInput,
  copy?: ReadinessCopy,
): ReadinessResult => {
  const c = { ...DEFAULT_COPY, ...copy };
  const normalizedQuestion = input.question.trim();
  const normalizedDescription = input.description.trim();
  const attachmentCount = input.attachmentCount ?? 0;

  const filledOptions = input.optionTexts
    .map((text) => text.trim())
    .filter((text) => text.length > 0);
  const uniqueOptions = new Set(filledOptions.map((text) => text.toLowerCase()));
  const hasDuplicateOptions = uniqueOptions.size !== filledOptions.length;

  let questionHelp: string;
  if (normalizedQuestion.length < MIN_QUESTION_LEN) {
    questionHelp = c.questionShort;
  } else if (normalizedQuestion.length > MAX_QUESTION_LEN) {
    questionHelp = c.questionLong;
  } else {
    questionHelp = c.questionOk;
  }

  let optionHelp: string;
  if (hasDuplicateOptions) {
    optionHelp = c.optionDuplicate;
  } else if (filledOptions.length > MAX_OPTIONS) {
    optionHelp = c.optionTooMany;
  } else if (filledOptions.length < MIN_OPTIONS) {
    optionHelp = c.optionTooFew;
  } else {
    optionHelp = c.optionOk;
  }

  const hasContext = normalizedDescription.length >= MIN_CONTEXT_LEN || attachmentCount > 0;
  const contextHelp = hasContext ? c.contextOk : c.contextMissing;

  const items: ReadinessItem[] = [
    {
      label: '질문 명확성',
      passed:
        normalizedQuestion.length >= MIN_QUESTION_LEN &&
        normalizedQuestion.length <= MAX_QUESTION_LEN,
      help: questionHelp,
    },
    {
      label: '선택지 스캔',
      passed:
        filledOptions.length >= MIN_OPTIONS &&
        filledOptions.length <= MAX_OPTIONS &&
        !hasDuplicateOptions,
      help: optionHelp,
    },
    {
      label: '결정 맥락',
      passed: hasContext,
      help: contextHelp,
    },
  ];

  const score = Math.round((items.filter((item) => item.passed).length / items.length) * 100);

  return { items, score };
};
