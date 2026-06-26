import { describe, expect, it, vi } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { PollDetailView } from '../pages/PollDetailView';
import { fixturePoll } from './fixturePoll';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';

// Mock tds to avoid ThemeProvider requirement in isolated renderToStaticMarkup for verif.
vi.mock('@toss/tds-mobile', async () => {
  const React = await import('react');
  return {
    Button: ({ loading, ...rest }: any) =>
      React.createElement(
        'button',
        { ...rest, 'data-loading': loading ? 'true' : undefined },
        rest.children,
      ),
  };
});

// This test renders the FULL shipped PollDetailView with the fixture.
// It asserts that the integrated share area (including the real PollShareQrSection) appears in the output.
describe('PollDetailView full render (verif)', () => {
  it('output from full view shows share CTAs + the QR/SNS/templates disclosure toggle (collapsed by default)', () => {
    const html = renderToStaticMarkup(
      React.createElement(PollDetailView, {
        poll: fixturePoll,
        isLoading: false,
        closed: false,
        showResults: true,
        hasVoted: false,
        votedOptionId: null,
        selectedOptionId: null,
        onSelect: () => {},
        onVote: () => {},
        voterName: '',
        setVoterName: () => {},
        comment: '',
        setComment: () => {},
        commentPassword: '',
        setCommentPassword: () => {},
        leader: null,
        displayOptions: fixturePoll.options,
        winnerId: null,
        isOwner: false,
        confirmDelete: false,
        onDelete: () => {},
        remaining: null,
        shareUrl: 'https://picky-olive.vercel.app/poll/' + fixturePoll.id,
        onShare: () => {},
        onCopy: () => {},
        onCopyResult: () => {},
        onCopyText: () => {},
        onResultImageSaved: () => {},
        onBack: () => {},
        totalVotes: fixturePoll.totalVotes,
        comments: fixturePoll.comments,
      }),
    );

    // Integrated share card from the real View — QR·SNS 미리보기·공유 문구는 세로 스크롤 압축을 위해
    // 기본 접힘 디스클로저 뒤에 둬요. 초기 렌더엔 공유 CTA + 더보기 토글이 보여요.
    expect(html).toContain('친구에게 물어보기'); // 항상 보이는 핵심 공유 CTA
    expect(html).toContain('QR·SNS 미리보기·공유 문구 더보기'); // QR/미리보기/템플릿 디스클로저 토글
    expect(html).toContain(fixturePoll.question); // full context from the view

    // Stage 2 feature parity: rich decision tools (consumed from @picky/shared) are wired into the view.
    // The fixture is showResults+>0 votes+3 options → decision tools gate is open.
    expect(html).toContain('결정 신뢰도'); // DecisionConfidencePanel
    expect(html).toContain('결정 메모'); // DecisionMemoSheet
    expect(html).toContain('의견 토픽 클라우드'); // OpinionTopicCloud
    expect(html).toContain('결과 이미지로 저장'); // ResultImageExport

    // AC1: question prominent hero (large size/weight first)
    expect(html).toMatch(/font-size:26|fontSize:\s*26|font-weight:900|fontWeight:\s*900/);
    const qPos = html.indexOf(fixturePoll.question);
    // AC2/3: compact top meta, voting options appear before heavy secondary (share/QR)
    expect(html).toMatch(/명 참여/); // compact meta
    const firstOptPos = html.indexOf('>강남 고기집');
    // 공유 섹션(접힘 디스클로저 포함)은 투표 옵션 뒤에 와야 한다 — 핵심 액션(투표) 우선.
    const sharePos = html.indexOf('QR·SNS 미리보기·공유 문구 더보기');
    expect(qPos).toBeGreaterThan(-1);
    if (firstOptPos > -1 && sharePos > -1) {
      expect(firstOptPos).toBeLessThan(sharePos); // options before heavy share section
    }

    // capture static HTML to scratch for verification evidence (durable proof)
    try {
      const scratchDir =
        '/var/folders/xp/79glmmbj6970d74hvkgd4pg00000gp/T/grok-goal-98785c18098b/implementer';
      writeFileSync(join(scratchDir, 'poll-detail-view-rendered.html'), html);
    } catch {
      try {
        writeFileSync(join('.', 'poll-detail-view-rendered.html'), html);
      } catch {
        // ignore
      }
    }
  });

  // Leak guard: when results are hidden (results-visibility gate not yet open),
  // the comment bodies and the per-comment "콕 찝음" selected-option chip must NOT render,
  // so a viewer can't infer the opinion/vote distribution before participating.
  it('hides comment bodies + selected-option chip until results are unlocked', () => {
    const html = renderToStaticMarkup(
      React.createElement(PollDetailView, {
        poll: fixturePoll,
        isLoading: false,
        closed: false,
        // results gate CLOSED (e.g. resultsVisibility=afterVote and not voted)
        showResults: false,
        hasVoted: false,
        votedOptionId: null,
        selectedOptionId: null,
        onSelect: () => {},
        onVote: () => {},
        voterName: '',
        setVoterName: () => {},
        comment: '',
        setComment: () => {},
        commentPassword: '',
        setCommentPassword: () => {},
        leader: null,
        displayOptions: fixturePoll.options,
        winnerId: null,
        isOwner: false,
        confirmDelete: false,
        onDelete: () => {},
        remaining: null,
        shareUrl: 'https://picky-olive.vercel.app/poll/' + fixturePoll.id,
        onShare: () => {},
        onCopy: () => {},
        onCopyText: () => {},
        onResultImageSaved: () => {},
        onBack: () => {},
        totalVotes: fixturePoll.totalVotes,
        comments: fixturePoll.comments,
      }),
    );

    // Comment bodies are gated behind the results lock.
    expect(html).not.toContain('고기집이 회식 분위기 최고예요');
    expect(html).not.toContain('파스타도 괜찮지만 고기파가 많을 듯');
    // The "콕 찝음" chip (which option a commenter picked) must not leak.
    expect(html).not.toContain('콕 찝음');
    // Instead, a "open after participating" notice is shown so users know discussion exists.
    expect(html).toContain('참여 후');
    // The comment count itself (engagement signal, not the distribution) may still show.
    expect(html).toContain('친구들 한마디');
  });
});
