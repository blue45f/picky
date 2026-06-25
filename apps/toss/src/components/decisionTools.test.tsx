import { describe, expect, it, vi } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import type { Poll } from '../shared';
import { DecisionConfidencePanel } from './DecisionConfidencePanel';
import { DecisionMemoSheet } from './DecisionMemoSheet';
import { OpinionTopicCloud } from './OpinionTopicCloud';
import { ShareTemplates } from './ShareTemplates';
import { ResultImageExport } from './ResultImageExport';

// TDS Button 은 ui.tsx 가 직접 쓰지 않지만, 안전하게 mock 해 node 렌더를 보장한다.
vi.mock('@toss/tds-mobile', async () => {
  const ReactMod = await import('react');
  return {
    Button: (props: any) => ReactMod.createElement('button', { ...props }, props.children),
  };
});

const SHARE_URL = 'https://picky-olive.vercel.app/poll/JOIN42';

const readyPoll = (over: Partial<Poll> = {}): Poll => ({
  id: 'JOIN42',
  question: '다음 회식 장소 어디로 갈까요?',
  description: '분기 축하 겸 가볍게',
  options: [
    { id: 1, text: '강남 고기집', voteCount: 14 },
    { id: 2, text: '홍대 파스타', voteCount: 3 },
    { id: 3, text: '을지로 포차', voteCount: 2 },
  ],
  comments: [
    {
      id: 101,
      voterName: '지수',
      comment: '고기집 분위기 최고예요 고기 고기',
      createdAt: '2026-06-20T10:05:00Z',
      selectedOptionId: 1,
      selectedOptionText: '강남 고기집',
    },
    {
      id: 102,
      voterName: '민준',
      comment: '고기 좋아요 분위기 좋아요',
      createdAt: '2026-06-20T10:12:00Z',
      selectedOptionId: 1,
    },
  ],
  createdAt: '2026-06-20T10:00:00Z',
  totalVotes: 19,
  ...over,
});

describe('DecisionConfidencePanel (consumes @picky/shared pollConfidence)', () => {
  it('renders a 0~100 confidence score, a state badge and four risk tiles', () => {
    const html = renderToStaticMarkup(
      React.createElement(DecisionConfidencePanel, {
        poll: readyPoll(),
        shareUrl: SHARE_URL,
        pollClosed: false,
      }),
    );
    expect(html).toContain('결정 신뢰도');
    expect(html).toMatch(/\d+%/); // 점수 퍼센트
    // 4 리스크 라벨 모두 노출
    for (const label of ['표본', '접전', '의견', '마감']) {
      expect(html).toContain(label);
    }
  });

  it('shows the copy affordance only when onCopyText is provided', () => {
    const withCopy = renderToStaticMarkup(
      React.createElement(DecisionConfidencePanel, {
        poll: readyPoll(),
        shareUrl: SHARE_URL,
        pollClosed: false,
        onCopyText: () => {},
      }),
    );
    const withoutCopy = renderToStaticMarkup(
      React.createElement(DecisionConfidencePanel, {
        poll: readyPoll(),
        shareUrl: SHARE_URL,
        pollClosed: false,
      }),
    );
    expect(withCopy).toContain('결정 공지 문구 복사');
    expect(withoutCopy).not.toContain('결정 공지 문구 복사');
  });
});

describe('DecisionMemoSheet (consumes buildDecisionMemo/buildActionPlan/buildConsensusNarrative)', () => {
  it('renders the decision line, announcement preview and owner/date inputs', () => {
    const html = renderToStaticMarkup(
      React.createElement(DecisionMemoSheet, {
        poll: readyPoll(),
        shareUrl: SHARE_URL,
        pollClosed: false,
        onCopyText: () => {},
      }),
    );
    expect(html).toContain('결정 메모');
    expect(html).toContain('강남 고기집'); // selectedDecision 선두
    expect(html).toContain('담당자');
    expect(html).toContain('공지 미리보기');
    expect(html).toContain('결정 메모 복사');
  });
});

describe('OpinionTopicCloud (consumes extractKeywords)', () => {
  it('renders weighted keyword chips extracted from comments', () => {
    const html = renderToStaticMarkup(
      React.createElement(OpinionTopicCloud, {
        poll: readyPoll(),
        onCopyText: () => {},
      }),
    );
    expect(html).toContain('의견 토픽 클라우드');
    // '고기'/'분위기' 가 반복되어 키워드로 추출되어야 한다.
    expect(html).toMatch(/고기|분위기/);
    expect(html).toContain('토픽 복사');
  });

  it('falls back to an empty-state note when there are no opinions', () => {
    const html = renderToStaticMarkup(
      React.createElement(OpinionTopicCloud, {
        poll: readyPoll({ comments: [] }),
      }),
    );
    expect(html).toContain('아직 반복 키워드를 만들 만큼 의견이 없어요');
  });
});

describe('ShareTemplates (consumes buildSnsPreviewContent)', () => {
  it('renders kakao/meeting/reminder templates with the share url', () => {
    const html = renderToStaticMarkup(
      React.createElement(ShareTemplates, {
        poll: readyPoll(),
        shareUrl: SHARE_URL,
        onCopyText: () => {},
      }),
    );
    expect(html).toContain('카카오톡');
    expect(html).toContain('회의');
    expect(html).toContain('리마인더');
    expect(html).toContain('상황별 공유 문구');
  });
});

describe('ResultImageExport (consumes buildPollResultImageDataUrl)', () => {
  it('renders theme/content controls and degrades gracefully without a DOM canvas', () => {
    // node 환경엔 document.createElement('canvas')가 없어 빌더가 throw → 폴백 노트가 떠야 한다.
    const html = renderToStaticMarkup(
      React.createElement(ResultImageExport, {
        poll: readyPoll(),
        shareUrl: SHARE_URL,
        onNotify: () => {},
      }),
    );
    expect(html).toContain('결과 이미지로 저장');
    expect(html).toContain('다크'); // 테마 세그먼트
    expect(html).toContain('대표 의견'); // 콘텐츠 토글
  });
});
