import type { Poll } from './index';

/**
 * 합의 내러티브 — 결과 흐름(접전·우세·합의 강함 등)을 자동 라벨/해석 문구로 환산하는 순수 로직.
 * PollDetail의 "강한 선호/접전" 자동 요약을 web/toss가 공유하도록 단일화한다.
 */

/** 합의 라벨(결과 흐름 분류). */
export type ConsensusLabel = '참여 대기' | '접전' | '합의 강함' | '우세' | '의견 분산';

export interface ConsensusNarrativeInput {
  poll: Pick<Poll, 'totalVotes' | 'options'>;
  /** 1·2위 격차(표). */
  voteGap: number;
  /** 선두 득표율(%). */
  leadingShare: number;
}

export interface ConsensusNarrative {
  consensusLabel: ConsensusLabel;
  /** 해석 한 줄(결정에 참고할 다음 행동 힌트). */
  decisionHint: string;
}

/**
 * 결과 통계로부터 합의 라벨과 해석 한 줄을 만든다(PollDetail buildConsensusNarrative 동일).
 * - 참여 0표 → 참여 대기
 * - 격차 1표 이하(선택지 2개 이상) → 접전
 * - 선두 65% 이상 → 합의 강함
 * - 선두 50% 이상 → 우세
 * - 그 외 → 의견 분산
 */
export const buildConsensusNarrative = (input: ConsensusNarrativeInput): ConsensusNarrative => {
  const { poll, voteGap, leadingShare } = input;
  let consensusLabel: ConsensusLabel = '의견 분산';
  if (poll.totalVotes === 0) {
    consensusLabel = '참여 대기';
  } else if (voteGap <= 1 && poll.options.length > 1) {
    consensusLabel = '접전';
  } else if (leadingShare >= 65) {
    consensusLabel = '합의 강함';
  } else if (leadingShare >= 50) {
    consensusLabel = '우세';
  }

  let decisionHint = '결과가 갈리고 있습니다. 피드백을 기준으로 선택지 차이를 좁혀보세요.';
  if (poll.totalVotes === 0) {
    decisionHint = '첫 투표가 들어오면 결과 흐름을 해석할 수 있습니다.';
  } else if (consensusLabel === '접전') {
    decisionHint = '상위 선택지 차이가 작습니다. 링크를 더 공유해 표본을 늘리는 편이 좋습니다.';
  } else if (consensusLabel === '합의 강함') {
    decisionHint =
      '상위 선택지에 의견이 모이고 있습니다. 댓글 맥락까지 확인한 뒤 결정하기 좋습니다.';
  }

  return { consensusLabel, decisionHint };
};
