import type { Poll, PollComment, PollOption } from './index';
import { optionPercent } from './poll';

/**
 * 결정 메모·액션 플랜 — 투표 결과를 공유/실행용 텍스트(마크다운형)와
 * 액션 아이템(담당자·기한·근거) 구조로 환산하는 순수 로직.
 * web/toss 두 앱이 동일한 문구·구조를 쓰도록 단일화한다.
 */

/** 결과 표에서 선두/격차 등 메모에 필요한 값을 뽑은 순수 통계. */
export interface MemoStats {
  leader: PollOption | null;
  runnerUp: PollOption | null;
  leaderShare: number;
  voteGap: number;
}

const computeMemoStats = (poll: Poll): MemoStats => {
  const sortedOptions = [...poll.options].sort((a, b) => b.voteCount - a.voteCount);
  const leader = sortedOptions[0] || null;
  const runnerUp = sortedOptions[1] || null;
  const leaderShare =
    poll.totalVotes > 0 && leader ? optionPercent(leader.voteCount, poll.totalVotes) : 0;
  const voteGap = leader ? leader.voteCount - (runnerUp?.voteCount || 0) : 0;
  return { leader, runnerUp, leaderShare, voteGap };
};

/** 가장 최근 한마디(댓글) 1개. 없으면 null. */
const latestComment = (comments: PollComment[]): PollComment | null =>
  [...comments].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  )[0] || null;

/** PollDetail "[picky 결정 메모]" 텍스트 입력. consensusLabel/decisionHint는 합의 내러티브 결과. */
export interface DecisionMemoInput {
  poll: Poll;
  shareUrl: string;
  pollClosed: boolean;
  /** 합의 라벨(buildConsensusNarrative.consensusLabel). */
  consensusLabel: string;
  /** 해석 한 줄(buildConsensusNarrative.decisionHint). */
  decisionHint: string;
  /** 선두 옵션(이미 계산된 값). 미지정 시 내부에서 산출. */
  leadingOption?: PollOption | null;
  /** 선두 득표율(%). 미지정 시 내부에서 산출. */
  leadingShare?: number;
  /** 1·2위 격차(표). 미지정 시 내부에서 산출. */
  voteGap?: number;
}

/**
 * "[picky 결정 메모]" 공유 텍스트를 만든다(PollDetail decisionMemo 동일 문구).
 * 줄 단위 배열을 join('\n')한 결과를 돌려준다.
 */
export const buildDecisionMemo = (input: DecisionMemoInput): string => {
  const { poll, shareUrl, pollClosed, consensusLabel, decisionHint } = input;
  const stats = computeMemoStats(poll);
  const leadingOption = input.leadingOption !== undefined ? input.leadingOption : stats.leader;
  const leadingShare = input.leadingShare ?? stats.leaderShare;
  const voteGap = input.voteGap ?? stats.voteGap;
  const featured = latestComment(poll.comments || []);

  return [
    `[picky 결정 메모] ${poll.question}`,
    `상태: ${pollClosed ? '마감' : consensusLabel}`,
    leadingOption
      ? `선두: ${leadingOption.text} (${leadingOption.voteCount}표, ${leadingShare}%)`
      : '선두: 아직 없음',
    `참여: ${poll.totalVotes}명 · 의견 ${(poll.comments || []).length}개 · 격차 ${voteGap}표`,
    `해석: ${decisionHint}`,
    featured ? `대표 의견: ${featured.comment} - ${featured.voterName}` : '대표 의견: 아직 없음',
    `결과 링크: ${shareUrl}`,
  ].join('\n');
};

/** 액션 플랜 입력 정책 — 담당자/기한은 앱(폼)이 채워 전달. */
export interface ActionPlanInput {
  poll: Poll;
  shareUrl: string;
  /** 실행 담당자(빈 값이면 "담당자 지정 필요"). */
  owner: string;
  /** 후속 점검 기한(YYYY-MM-DD 등, 빈 값이면 "기한 미정"). */
  dueDate: string;
}

/** 업무 인수인계 체크 항목(담당자/기한/결정안/근거). 색·도움말 일부는 ready로 앱이 매핑. */
export interface HandoffItem {
  key: 'owner' | 'dueDate' | 'decision' | 'evidence';
  label: string;
  ready: boolean;
  value: string;
  help: string;
}

/** 실행 단계(공지/담당/근거/점검). */
export interface ActionStep {
  id: 'announce' | 'owner' | 'evidence' | 'review';
  title: string;
  description: string;
}

/** 액션 플랜 산출물 — 핸드오프·단계·마크다운·공지문 + 파생값. */
export interface ActionPlan {
  leader: PollOption | null;
  leaderShare: number;
  voteGap: number;
  assignee: string;
  dueDateLabel: string;
  selectedDecision: string;
  representativeComments: PollComment[];
  handoffItems: HandoffItem[];
  steps: ActionStep[];
  markdown: string;
  announcement: string;
}

/**
 * "[picky 액션 플랜]" + 결정 공지문을 만든다(ActionItemPlanner 동일 구조·문구).
 * 담당자/기한이 비면 placeholder 문구로 대체하고, 선두 선택지를 결정안으로 쓴다.
 */
export const buildActionPlan = (input: ActionPlanInput): ActionPlan => {
  const { poll, shareUrl, owner, dueDate } = input;
  const stats = computeMemoStats(poll);
  const { leader, leaderShare, voteGap } = stats;
  const representativeComments = (poll.comments || [])
    .filter((commentItem) => !leader || commentItem.selectedOptionId === leader.id)
    .slice(0, 3);
  const assignee = owner.trim() || '담당자 지정 필요';
  const dueDateLabel = dueDate || '기한 미정';
  const selectedDecision = leader
    ? `${leader.text} (${leader.voteCount}표, ${leaderShare}%)`
    : '아직 확정 선택지 없음';
  const hasOwner = Boolean(owner.trim());
  const hasDueDate = Boolean(dueDate);
  const hasEvidence = representativeComments.length > 0;

  const handoffItems: HandoffItem[] = [
    {
      key: 'owner',
      label: '담당자',
      ready: hasOwner,
      value: assignee,
      help: hasOwner
        ? '공지문과 일정에 담당자가 명시됩니다.'
        : '실행 책임자가 비어 있으면 결정이 후속 행동으로 이어지기 어렵습니다.',
    },
    {
      key: 'dueDate',
      label: '기한',
      ready: hasDueDate,
      value: dueDateLabel,
      help: hasDueDate
        ? '후속 점검 일정과 액션 플랜에 같은 날짜가 반영됩니다.'
        : '점검일을 정하면 회의 후 실행 여부를 다시 확인할 수 있습니다.',
    },
    {
      key: 'decision',
      label: '결정안',
      ready: Boolean(leader),
      value: selectedDecision,
      help: leader
        ? '선두 선택지를 기준으로 공지와 실행 단계가 생성됩니다.'
        : '투표가 모이면 결정안이 자동으로 채워집니다.',
    },
    {
      key: 'evidence',
      label: '근거',
      ready: hasEvidence,
      value: hasEvidence ? `대표 의견 ${representativeComments.length}개` : '대표 의견 없음',
      help: hasEvidence
        ? '대표 의견을 회의록과 업무 카드에 붙일 수 있습니다.'
        : '선택 이유가 없으면 실행 근거를 별도로 보강하는 편이 좋습니다.',
    },
  ];

  const steps: ActionStep[] = [
    {
      id: 'announce',
      title: '결정 공지',
      description: `${selectedDecision} 기준으로 참여자에게 결과와 근거를 공유합니다.`,
    },
    {
      id: 'owner',
      title: '담당자 지정',
      description: `${assignee}가 실행 범위, 필요한 리소스, 첫 작업을 확인합니다.`,
    },
    {
      id: 'evidence',
      title: '근거 보관',
      description: `결과 링크와 대표 의견 ${representativeComments.length}개를 회의록에 남깁니다.`,
    },
    {
      id: 'review',
      title: '후속 점검',
      description: `${dueDate || '기한 미정'}까지 진행 여부와 남은 이슈를 점검합니다.`,
    },
  ];

  const commentLines =
    representativeComments.length > 0
      ? representativeComments
          .map(
            (commentItem, index) =>
              `${index + 1}. ${commentItem.comment} - ${commentItem.voterName || '익명'}`,
          )
          .join('\n')
      : '대표 의견이 아직 없습니다.';

  const markdown = [
    `[picky 액션 플랜]`,
    `질문: ${poll.question}`,
    `결정안: ${selectedDecision}`,
    `담당자: ${assignee}`,
    `기한: ${dueDate || '기한 미정'}`,
    `참여: ${poll.totalVotes}명 · 의견 ${poll.comments.length}개 · 격차 ${voteGap}표`,
    `결과 링크: ${shareUrl}`,
    '',
    '[업무 인수인계 체크]',
    ...handoffItems.map(
      (item) => `- ${item.label}: ${item.value} (${item.ready ? '준비됨' : '보완 필요'})`,
    ),
    '',
    '[실행 단계]',
    ...steps.map((step, index) => `${index + 1}. ${step.title}: ${step.description}`),
    '',
    '[대표 의견]',
    commentLines,
  ].join('\n');

  const announcement = [
    `[결정 공지] ${poll.question}`,
    '',
    `결정안: ${selectedDecision}`,
    `담당자: ${assignee}`,
    `기한: ${dueDate || '기한 미정'}`,
    `근거: 총 ${poll.totalVotes}명이 참여했고, 1위와 2위 격차는 ${voteGap}표입니다.`,
    '',
    `결과와 의견: ${shareUrl}`,
    '위 기준으로 다음 실행을 진행하겠습니다.',
  ].join('\n');

  return {
    leader,
    leaderShare,
    voteGap,
    assignee,
    dueDateLabel,
    selectedDecision,
    representativeComments,
    handoffItems,
    steps,
    markdown,
    announcement,
  };
};
