/**
 * 공유 텍스트·오리진 정규화 코어 — web/toss 두 앱의 lib/pollShare.ts 가 같은 문구·정규화 규약을
 * 쓰도록 단일화한 순수 모듈. DOM/SDK/env 에 의존하지 않는다.
 *
 * 주의: 오리진을 "어떻게 고를지"(resolvePollShareUrl·getShareOrigin)는 앱별 본질 차이라 여기 두지 않는다.
 * - web: 스냅샷/share-origin(VITE_SHARE_BASE_URL 우선) 기반 공개 웹 URL
 * - toss: 토스 딥링크(getTossShareLink) 우선, 밖에선 공개 웹 오리진으로 폴백
 * 그 분기는 각 앱의 lib/pollShare.ts 에 남기고, 여기서는 공통 빌딩블록만 제공한다.
 */
import type { Poll } from './index';
import { buildSnsPreviewContent } from './snsPreview';

/** 공유 메시지 접두어 — web/toss 동일. */
export const SHARE_PREFIX = '[피키 투표] ';

/** 투표 공유 본문(접두어 + 질문 + 참여 유도). 링크는 호출부에서 덧붙인다. */
export const resolveShareText = (poll: Poll): string =>
  `${SHARE_PREFIX}${poll.question}\n\n결정에 참여하고 의견을 남겨주세요.`;

/** 상황별 공유 문구 프리셋 id — web/toss 공통(카톡/회의/SNS/리마인더). */
export type SharePresetId = 'kakao' | 'meeting' | 'social' | 'reminder';

/**
 * 상황별 공유 문구 프리셋(복사해서 붙여넣는 텍스트) 한 개.
 * label/title/hint 는 카드 메타, body 는 실제 복사 문구(공유 링크 포함). accent(색)는 앱별로 입혀요.
 */
export interface SharePreset {
  id: SharePresetId;
  /** 칩/짧은 라벨('카톡 단톡방'). */
  label: string;
  /** 카드 헤드라인('가볍게 투표 요청'). */
  title: string;
  /** 한 줄 설명('친구·단톡방에 바로 붙여넣기 좋아요'). */
  hint: string;
  /** 이모지. */
  emoji: string;
  /** 복사용 본문(공유 링크 포함). */
  body: string;
}

/** 본문 조립 후 연속 빈 줄을 한 줄로 접어요(선택지 블록이 비었을 때 빈 줄 중첩 방지). */
const collapseBlankLines = (lines: string[]): string =>
  lines.filter((line, index, all) => !(line === '' && all[index - 1] === '')).join('\n');

/**
 * 상황별 공유 문구 프리셋을 만든다 — web/toss 두 앱이 같은 4종·같은 문구를 쓰도록 단일화.
 * 카드 콘텐츠(제목/요약/노출 선택지/예상시간)는 buildSnsPreviewContent 단일 소스에서 가져와
 * 카카오/회의/SNS/리마인더 상황에 맞는 본문으로 조립해요(로직 중복 0).
 */
export const buildSharePresets = (poll: Poll, shareUrl: string): SharePreset[] => {
  const content = buildSnsPreviewContent({
    question: poll.question,
    description: poll.description,
    options: poll.options.map((option) => option.text),
    imageUrl: poll.options.find((option) => option.imageUrl)?.imageUrl,
  });
  const optionList = content.visibleOptions
    .map((option, index) => `${index + 1}. ${option}`)
    .join('\n');
  const extraLine =
    content.hiddenOptionCount > 0 ? `\n…외 ${content.hiddenOptionCount}개 선택지 더 있어요` : '';
  const optionBlock = optionList ? `${optionList}${extraLine}` : '';

  return [
    {
      id: 'kakao',
      label: '카톡 단톡방',
      title: '가볍게 투표 요청',
      hint: '친구·단톡방에 바로 붙여넣기 좋아요',
      emoji: '💛',
      body: collapseBlankLines([
        `${content.title} 🤔`,
        content.summary,
        '',
        optionBlock,
        '',
        `👉 ${content.estimatedSeconds}초면 골라줄 수 있어요: ${shareUrl}`,
      ]),
    },
    {
      id: 'meeting',
      label: '회의·업무',
      title: '동료 의견 모으기',
      hint: '회의·수업·업무 채널에 의견 요청',
      emoji: '🧑‍💼',
      body: collapseBlankLines([
        `[의견 요청] ${content.title}`,
        '',
        '아래 선택지 중 의견 부탁드립니다.',
        optionBlock,
        '',
        `결정 전에 빠르게 표만 모으려 합니다. 참여 링크: ${shareUrl}`,
      ]),
    },
    {
      id: 'social',
      label: 'SNS 게시',
      title: '맥락 포함 공유',
      hint: '스토리·커뮤니티·X 같은 공개 채널용',
      emoji: '🌐',
      body: [
        content.title,
        '',
        '선택지가 고민돼서 투표로 의견을 모으고 있어요. 가장 납득되는 선택에 투표하고 이유를 남겨주세요.',
        shareUrl,
      ].join('\n'),
    },
    {
      id: 'reminder',
      label: '리마인더',
      title: '마감 전 한 번 더',
      hint: '아직 안 고른 사람에게 가볍게',
      emoji: '⏰',
      body: [
        '⏰ 아직 안 고르셨다면!',
        `"${content.title}"`,
        '',
        '한 번만 더 부탁드려요. 금방 끝나요.',
        shareUrl,
      ].join('\n'),
    },
  ];
};

/** 끝의 슬래시(/) 들을 모두 제거. 오리진 정규화의 전처리. */
export const trimTrailingSlashes = (value: string): string => {
  let end = value.length;
  while (end > 0 && value.codePointAt(end - 1) === 47) {
    end -= 1;
  }
  return end === value.length ? value : value.slice(0, end);
};

/**
 * 오리진 후보 문자열을 정규화 — 빈 값/무효면 null.
 * 프로토콜이 없으면 https:// 를 붙이고, URL.origin 으로 좁힌다.
 */
export const normalizeOrigin = (value: string | null | undefined): string | null => {
  const trimmed = value ? trimTrailingSlashes(value.trim()) : '';
  if (!trimmed) {
    return null;
  }
  const withProtocol =
    trimmed.startsWith('http://') || trimmed.startsWith('https://')
      ? trimmed
      : `https://${trimmed}`;
  try {
    return new URL(withProtocol).origin;
  } catch {
    return null;
  }
};

/**
 * 외부(토스 밖)에서도 열리는 공개 웹 오리진인지.
 * localhost/127.0.0.1 과 토스 미니앱 WebView 호스트(*.tossmini.com)는 공유 대상이 아니다.
 */
export const isPublicWebHost = (origin: string): boolean => {
  try {
    const { hostname } = new URL(origin);
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return false;
    }
    if (hostname.endsWith('.tossmini.com')) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
};
