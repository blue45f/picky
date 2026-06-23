import { describe, expect, it, vi } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { PollDetailView } from '../pages/PollDetailView';
import { fixturePoll } from './fixturePoll';

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
  });
});
