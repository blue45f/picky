import { describe, expect, it } from 'vitest';
import type { Poll } from './index';
import {
  REPORT_AUDIENCES,
  buildPollReport,
  buildReportText,
  getSentimentLabel,
} from './pollReport';

const makePoll = (over: Partial<Poll> = {}): Poll => ({
  id: 'abc',
  question: '어디로 갈까?',
  options: [
    { id: 1, text: '바다', voteCount: 4 },
    { id: 2, text: '산', voteCount: 2 },
  ],
  comments: [],
  createdAt: '2026-01-01T00:00:00Z',
  totalVotes: 6,
  ...over,
});

const comment = (text: string) => ({
  id: Math.random(),
  voterName: 'x',
  comment: text,
  createdAt: '2026-01-01T00:00:00Z',
});

describe('getSentimentLabel', () => {
  it('detects positive sentiment', () => {
    expect(getSentimentLabel([comment('정말 좋고 추천해요'), comment('만족')]).label).toBe(
      '긍정 우세',
    );
  });

  it('detects risk sentiment', () => {
    expect(getSentimentLabel([comment('문제가 걱정되고 부담')]).label).toBe('리스크 우세');
  });

  it('is neutral when mixed or empty', () => {
    expect(getSentimentLabel([]).label).toBe('중립');
    expect(getSentimentLabel([comment('좋지만 걱정')]).label).toBe('중립');
  });
});

describe('buildReportText', () => {
  const base = {
    confidenceScore: 60,
    feedbackRate: 20,
    leaderLine: '바다 (4표, 67%)',
    poll: makePoll(),
    pollClosed: false,
    sentimentLabel: '중립',
    shareUrl: 's',
    voteGap: 2,
    voteGapShare: 33,
  };

  it('participants report thanks and shares result', () => {
    const text = buildReportText({ ...base, audience: 'participants' });
    expect(text).toContain('[picky 결과 공유]');
    expect(text).toContain('참여해주셔서 감사합니다');
  });

  it('retrospective report lists improvement points', () => {
    const text = buildReportText({ ...base, audience: 'retrospective' });
    expect(text).toContain('[picky 운영 회고]');
    expect(text).toContain('[개선 포인트]');
    expect(text).toContain('표본이 작습니다');
  });

  it('decision report includes recommendation and evidence', () => {
    const text = buildReportText({ ...base, audience: 'decision' });
    expect(text).toContain('[picky 의사결정 리포트]');
    expect(text).toContain('권고안: 바다 (4표, 67%)');
    expect(text).toContain('아직 대표 의견이 없습니다.');
  });
});

describe('buildPollReport', () => {
  it('returns active audience, sentiment and report text', () => {
    const report = buildPollReport({
      poll: makePoll({ comments: [comment('좋아요 추천')] }),
      shareUrl: 'https://picky.io/p/abc',
      pollClosed: true,
      audience: 'decision',
    });
    expect(report.activeAudience.id).toBe('decision');
    expect(report.leaderLine).toContain('바다');
    expect(report.sentiment.label).toBe('긍정 우세');
    expect(report.reportText).toContain('[picky 의사결정 리포트]');
    expect(report.confidenceScore).toBeGreaterThan(0);
  });

  it('exposes 3 canonical audiences', () => {
    expect(REPORT_AUDIENCES.map((a) => a.id)).toEqual([
      'decision',
      'participants',
      'retrospective',
    ]);
  });
});
