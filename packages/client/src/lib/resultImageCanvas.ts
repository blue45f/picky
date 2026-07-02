// 토스 `.ait` 번들러(collect-package-version)가 @picky/shared 패키지명의 런타임 import를
// 처리하지 못해, 타입은 번들러 무관 상대 경로(공유 소스)로 가져오고 값(optionPercent)은
// 자체 포함한다. 웹(vite)도 동일하게 해석된다.
import type { Poll } from '../../../shared/src/index';

/**
 * 결과 카드 이미지(OG/공유용 1200x630) 순수 Canvas 드로잉 — web/toss 두 앱이 공유한다.
 * DOM/React에 직접 의존하지 않도록 canvas 생성을 주입(createCanvas)할 수 있게 한다.
 * 의존성 추가 없이 순수 CanvasRenderingContext2D API만 쓴다(html-to-image 등 금지).
 */

/** 옵션 득표율(%) 정수 반올림 — @picky/shared optionPercent 와 동일 구현(번들러 무관 자체 포함). */
const optionPercent = (voteCount: number, totalVotes: number): number =>
  totalVotes > 0 ? Math.round((voteCount / totalVotes) * 100) : 0;

/** 결과 이미지 테마(다크/라이트/발표용/프리미엄 골드). */
export type ResultImageTheme = 'classic' | 'light' | 'presentation' | 'gold';

/** 카드에 포함할 콘텐츠 토글(대표 의견/참여 코드/공유 링크). */
export type ResultImageContentKey = 'comment' | 'joinCode' | 'shareUrl';
export type ResultImageContentOptions = Record<ResultImageContentKey, boolean>;

/** 테마별 색 팔레트. */
export interface ResultImageThemeConfig {
  bgStart: string;
  bgMid: string;
  bgEnd: string;
  primary: string;
  accent: string;
  coral: string;
  title: string;
  text: string;
  muted: string;
  line: string;
  panel: string;
  barTrack: string;
}

export const RESULT_IMAGE_THEMES: Record<ResultImageTheme, ResultImageThemeConfig> = {
  classic: {
    bgStart: '#061411',
    bgMid: '#0d2a25',
    bgEnd: '#08100f',
    primary: '#20d6b2',
    accent: '#e8c84d',
    coral: '#ff6b70',
    title: '#f4fffc',
    text: '#b8d6cf',
    muted: '#7ca59b',
    line: 'rgba(255,255,255,0.08)',
    panel: 'rgba(255,255,255,0.07)',
    barTrack: 'rgba(255,255,255,0.12)',
  },
  light: {
    bgStart: '#f6fffc',
    bgMid: '#e9f8f3',
    bgEnd: '#fff7dc',
    primary: '#0f8d78',
    accent: '#b58b00',
    coral: '#cf4d54',
    title: '#061411',
    text: '#22443d',
    muted: '#5d7771',
    line: 'rgba(6,20,17,0.14)',
    panel: 'rgba(6,20,17,0.06)',
    barTrack: 'rgba(6,20,17,0.12)',
  },
  presentation: {
    bgStart: '#111827',
    bgMid: '#0f2f3a',
    bgEnd: '#19142c',
    primary: '#5eead4',
    accent: '#fde047',
    coral: '#fb7185',
    title: '#ffffff',
    text: '#d8fbf3',
    muted: '#9fb8c6',
    line: 'rgba(255,255,255,0.16)',
    panel: 'rgba(255,255,255,0.1)',
    barTrack: 'rgba(255,255,255,0.16)',
  },
  // 프리미엄 골드 — 토스 앱에선 보상형 광고 시청으로 잠금 해제되는 스페셜 룩.
  gold: {
    bgStart: '#171004',
    bgMid: '#2b1f08',
    bgEnd: '#100a03',
    primary: '#f4c560',
    accent: '#2ee0bf',
    coral: '#ff8a5c',
    title: '#fff8e8',
    text: '#ecd9ac',
    muted: '#b39c6d',
    line: 'rgba(244,197,96,0.18)',
    panel: 'rgba(244,197,96,0.1)',
    barTrack: 'rgba(244,197,96,0.18)',
  },
};

/** 콘텐츠 토글 기본값(전부 포함). */
export const DEFAULT_RESULT_IMAGE_CONTENT: ResultImageContentOptions = {
  comment: true,
  joinCode: true,
  shareUrl: true,
};

const drawWrappedText = (
  context: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
  maxLines = Number.POSITIVE_INFINITY,
): number => {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = '';

  words.forEach((word) => {
    const nextLine = line ? `${line} ${word}` : word;
    if (context.measureText(nextLine).width <= maxWidth) {
      line = nextLine;
      return;
    }

    if (line) {
      lines.push(line);
    }
    line = word;
  });

  if (line) {
    lines.push(line);
  }

  const visibleLines = lines.slice(0, maxLines);
  visibleLines.forEach((visibleLine, index) => {
    const suffix = index === maxLines - 1 && lines.length > maxLines ? '...' : '';
    context.fillText(`${visibleLine}${suffix}`, x, y + index * lineHeight);
  });

  return y + visibleLines.length * lineHeight;
};

const drawResultImageOptionBars = (
  context: CanvasRenderingContext2D,
  themeConfig: ResultImageThemeConfig,
  poll: Poll,
): void => {
  const sortedOptions = [...poll.options].sort((a, b) => b.voteCount - a.voteCount).slice(0, 4);
  let barY = 318;
  sortedOptions.forEach((option, index) => {
    const percentage = optionPercent(option.voteCount, poll.totalVotes);
    context.fillStyle = themeConfig.title;
    context.font = '800 22px "Pretendard Variable", Arial, sans-serif';
    drawWrappedText(context, `${index + 1}. ${option.text}`, 80, barY, 560, 26, 1);
    context.fillStyle = themeConfig.barTrack;
    context.fillRect(80, barY + 18, 520, 12);
    let barColor = themeConfig.muted;
    if (index === 0) {
      barColor = themeConfig.primary;
    } else if (index === 1) {
      barColor = themeConfig.accent;
    }
    context.fillStyle = barColor;
    context.fillRect(80, barY + 18, Math.max(8, (520 * percentage) / 100), 12);
    context.fillStyle = themeConfig.text;
    context.font = '700 20px "Pretendard Variable", Arial, sans-serif';
    context.fillText(`${option.voteCount}표 · ${percentage}%`, 620, barY + 26);
    barY += 52;
  });
};

const drawResultImageCommentPanel = (
  context: CanvasRenderingContext2D,
  themeConfig: ResultImageThemeConfig,
  poll: Poll,
): void => {
  const latestComment =
    [...poll.comments].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    )[0] || null;
  context.fillStyle = themeConfig.panel;
  context.fillRect(780, 150, 340, 260);
  context.fillStyle = themeConfig.accent;
  context.font = '900 22px "Pretendard Variable", Arial, sans-serif';
  context.fillText('대표 의견', 810, 200);
  context.fillStyle = themeConfig.title;
  context.font = '800 28px "Pretendard Variable", Arial, sans-serif';
  drawWrappedText(
    context,
    latestComment?.comment || '아직 의견이 없습니다. 링크를 공유해 첫 번째 선택 이유를 받아보세요.',
    810,
    250,
    270,
    36,
    4,
  );
  context.fillStyle = themeConfig.muted;
  context.font = '700 18px "Pretendard Variable", Arial, sans-serif';
  drawWrappedText(
    context,
    latestComment
      ? `${latestComment.voterName} · ${latestComment.selectedOptionText || '선택지 정보 없음'}`
      : 'picky',
    810,
    394,
    270,
    24,
    1,
  );
};

const drawResultImageJoinCode = (
  context: CanvasRenderingContext2D,
  themeConfig: ResultImageThemeConfig,
  poll: Poll,
  hasComment: boolean,
): void => {
  const joinCodeY = hasComment ? 430 : 170;
  const joinCodeHeight = hasComment ? 92 : 210;
  context.fillStyle = themeConfig.panel;
  context.fillRect(780, joinCodeY, 340, joinCodeHeight);
  context.fillStyle = themeConfig.primary;
  context.font = '900 18px "Pretendard Variable", Arial, sans-serif';
  context.fillText('JOIN CODE', 810, joinCodeY + 34);
  context.fillStyle = themeConfig.accent;
  context.font = hasComment
    ? '900 42px "Pretendard Variable", Arial, sans-serif'
    : '900 60px "Pretendard Variable", Arial, sans-serif';
  drawWrappedText(
    context,
    poll.id,
    810,
    joinCodeY + (hasComment ? 80 : 126),
    260,
    hasComment ? 46 : 64,
    1,
  );
};

/** canvas 생성을 주입하기 위한 팩토리. 기본은 브라우저 document.createElement('canvas'). */
export type CanvasFactory = () => HTMLCanvasElement;

const defaultCanvasFactory: CanvasFactory = () => document.createElement('canvas');

/**
 * 결과 카드를 그려 PNG data URL을 돌려준다(순수 Canvas).
 * @param createCanvas 테스트/비DOM 환경에서 canvas 생성을 주입(미지정 시 document 사용).
 */
export const buildPollResultImageDataUrl = (
  poll: Poll,
  shareUrl: string,
  theme: ResultImageTheme,
  contentOptions: ResultImageContentOptions,
  createCanvas: CanvasFactory = defaultCanvasFactory,
): string => {
  const themeConfig = RESULT_IMAGE_THEMES[theme];
  const width = 1200;
  const height = 630;
  const canvas = createCanvas();
  const scale = 2;
  canvas.width = width * scale;
  canvas.height = height * scale;
  const context = canvas.getContext('2d');

  if (!context) {
    throw new Error('이미지 생성을 지원하지 않는 브라우저입니다.');
  }

  context.scale(scale, scale);
  const background = context.createLinearGradient(0, 0, width, height);
  background.addColorStop(0, themeConfig.bgStart);
  background.addColorStop(0.55, themeConfig.bgMid);
  background.addColorStop(1, themeConfig.bgEnd);
  context.fillStyle = background;
  context.fillRect(0, 0, width, height);

  const accent = context.createLinearGradient(80, 0, 520, 0);
  accent.addColorStop(0, themeConfig.primary);
  accent.addColorStop(0.62, themeConfig.accent);
  accent.addColorStop(1, themeConfig.coral);
  context.fillStyle = accent;
  context.fillRect(80, 520, 430, 12);

  context.fillStyle = themeConfig.line;
  context.fillRect(80, 74, 1040, 1);
  context.fillRect(80, 558, 1040, 1);

  context.fillStyle = themeConfig.primary;
  context.font = '800 24px "Pretendard Variable", Arial, sans-serif';
  context.fillText('PICKY RESULT', 80, 124);

  context.fillStyle = themeConfig.title;
  context.font = '900 48px "Pretendard Variable", Arial, sans-serif';
  const titleBottom = drawWrappedText(context, poll.question, 80, 188, 690, 58, 2);

  context.fillStyle = themeConfig.text;
  context.font = '700 22px "Pretendard Variable", Arial, sans-serif';
  context.fillText(
    `총 ${poll.totalVotes}표 · 의견 ${poll.comments.length}개`,
    80,
    titleBottom + 24,
  );

  drawResultImageOptionBars(context, themeConfig, poll);

  if (contentOptions.comment) {
    drawResultImageCommentPanel(context, themeConfig, poll);
  }

  if (contentOptions.joinCode) {
    drawResultImageJoinCode(context, themeConfig, poll, contentOptions.comment);
  }

  if (contentOptions.shareUrl) {
    context.fillStyle = themeConfig.muted;
    context.font = '700 18px "Pretendard Variable", Arial, sans-serif';
    drawWrappedText(context, shareUrl, 80, 594, 760, 22, 1);
  }
  context.fillStyle = themeConfig.title;
  context.font = '900 26px "Pretendard Variable", Arial, sans-serif';
  context.fillText('picky', 1010, 594);

  return canvas.toDataURL('image/png');
};
