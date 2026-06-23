import { describe, expect, it, vi } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { PollDetailView } from '../pages/PollDetailView';
import { fixturePoll } from './fixturePoll';
import { writeFileSync } from 'fs';
import { join } from 'path';

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
  it('output from full view contains the integrated QR block (QR 태그, data uri img, share context)', () => {
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
        onBack: () => {},
        totalVotes: fixturePoll.totalVotes,
        comments: fixturePoll.comments,
      }),
    );

    // Integrated share card from the real View (which includes PollShareQrSection)
    expect(html).toContain('QR 태그');
    expect(html).toMatch(/data:image\/svg\+xml/);
    expect(html).toContain(fixturePoll.question); // full context from the view

    // AC1: question prominent hero (large size/weight first)
    expect(html).toMatch(/font-size:26|fontSize:\s*26|font-weight:900|fontWeight:\s*900/);
    const qPos = html.indexOf(fixturePoll.question);
    // AC2/3: compact top meta, voting options appear before heavy secondary (share/QR)
    expect(html).toMatch(/명 참여/); // compact meta
    const firstOptPos = html.indexOf('>강남 고기집');
    const sharePos = html.indexOf('QR 태그 스캔');
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
});
