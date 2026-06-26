import type { Poll, PollOption, PollResultsVisibility } from './index';

/** 마감 시간이 지났는지. */
export const isPollClosed = (poll: Poll | null | undefined): boolean =>
  Boolean(poll?.endsAt) && Date.now() >= new Date(poll!.endsAt as string).getTime();

/**
 * 결과(상위 선택지·퍼센트·득표바·총표 등 표 파생 표시)를 드러내도 되는지 — web/toss/OG/스냅샷이
 * 같은 판단을 쓰도록 단일화한 게이트.
 *
 * resultsVisibility:
 * - 'always'  : 언제나 공개
 * - 'afterVote'(기본): 투표를 한(hasVoted) 사람에게만 공개. 단, 마감된(closed) 폴은 결과를 공개한다.
 *
 * resultsVisibility 미지정(레거시)은 'afterVote' 로 간주한다(서버 기본값과 일치).
 */
export const canRevealResults = (
  poll: Pick<Poll, 'resultsVisibility' | 'endsAt'> | null | undefined,
  hasVoted: boolean,
): boolean => {
  if (!poll) {
    return false;
  }
  if (poll.resultsVisibility === 'always') {
    return true;
  }
  return hasVoted || isPollClosed(poll as Poll);
};

/** resultsVisibility 정규화 — 'always' 외엔 전부 'afterVote'(레거시·null 포함). */
export const normalizeResultsVisibility = (
  value: PollResultsVisibility | null | undefined,
): PollResultsVisibility => (value === 'always' ? 'always' : 'afterVote');

/**
 * resultsVisibility 표시 라벨 — web/toss 두 앱이 동일 문구를 쓰도록 한 곳에서 통일.
 * - full        : 설정/상세 헤더용 풀 라벨
 * - short       : 작성 셀렉터/칩용 짧은 라벨(이모지 포함)
 * - hint        : 왜 그렇게 보이는지 한 줄 안내
 * - description : 작성/수정 셀렉터 카드의 한 줄 설명(어떤 동작인지 — hint 보다 행동 중심)
 */
export const RESULTS_VISIBILITY_LABELS: Record<
  PollResultsVisibility,
  { full: string; short: string; hint: string; description: string }
> = {
  afterVote: {
    full: '투표 후 결과 공개',
    short: '투표하고 보기 🗳️',
    hint: '다른 의견에 영향을 덜 받도록 투표한 뒤에 결과가 열려요.',
    description: '참여자는 선택을 마친 뒤 결과를 봐요.',
  },
  always: {
    full: '실시간 결과 공개',
    short: '항상 공개 👀',
    hint: '투표하지 않아도 실시간 집계 결과를 볼 수 있어요.',
    description: '공유 전부터 실시간 흐름을 보여줘요.',
  },
};

/**
 * 결과 공개 셀렉터 옵션 — web 작성/수정 화면(CreatePoll/EditPoll)의 로컬 재정의를 대체할 단일 소스.
 * value+label+description 으로, 카드형 셀렉터(라벨 + 한 줄 설명)에 바로 쓸 수 있다.
 * label 은 RESULTS_VISIBILITY_LABELS.short(이모지 포함)·description 은 그 description 을 그대로 끌어온다
 * (라벨/설명을 한 곳에서 관리해 web/toss 드리프트를 막는다). 렌더 순서는 afterVote → always.
 */
export const RESULTS_VISIBILITY_OPTIONS: ReadonlyArray<{
  value: PollResultsVisibility;
  label: string;
  description: string;
}> = (['afterVote', 'always'] as const).map((value) => ({
  value,
  label: RESULTS_VISIBILITY_LABELS[value].short,
  description: RESULTS_VISIBILITY_LABELS[value].description,
}));

/** afterVote 폴에서 아직 결과를 못 본 사람에게 보여줄 안내 문구. */
export const RESULTS_LOCKED_HINT = '투표하면 결과가 보여요';

/**
 * 작성자 표시 라벨 — web/toss 두 앱이 같은 표기 정책을 쓰도록 단일화한 헬퍼.
 * 우선순위:
 * 1) 닉네임이 있으면 닉네임 그대로(회원 글이 '익명/비회원'으로 잘못 표기되는 모순 제거)
 * 2) 게스트면 '비회원'(처음부터 비회원으로 작성한 게스트 폴 — creatorIsGuest=true 또는 guest- 접두 id)
 * 3) creatorId가 있으면 '회원', 없으면 '익명'
 *
 * '익명'은 creatorId가 없고 게스트도 아닌 경우 — 회원이 탈퇴해 작성자가 해제된(익명화된) 폴이 여기 해당한다.
 * deleteUser 가 탈퇴 회원 폴을 creatorId=null·creatorIsGuest=false 로 익명화하므로, 원래 게스트('비회원')와
 * 구분돼 '익명'으로 표기된다(탈퇴 회원은 게스트가 아니므로 '비회원'이 아니라 '익명'이 맞다).
 *
 * 닉네임은 단건 상세 응답에만 채워지므로(목록엔 비움), 목록 카드는 닉네임 없이
 * 회원/비회원/익명만 구분된다(정책상 의도된 동작).
 */
export const resolveCreatorLabel = (
  nickname: string | null | undefined,
  creatorId: string | null | undefined,
  isGuest: boolean | undefined,
): string => {
  const trimmedNickname = nickname?.trim();
  if (trimmedNickname) {
    return trimmedNickname;
  }
  const guest = isGuest || Boolean(creatorId?.startsWith('guest-'));
  if (guest) {
    return '비회원';
  }
  return creatorId ? '회원' : '익명';
};

/** 옵션 득표율(%) 정수 반올림. */
export const optionPercent = (voteCount: number, totalVotes: number): number =>
  totalVotes > 0 ? Math.round((voteCount / totalVotes) * 100) : 0;

/** 최다 득표 옵션. 옵션이 없으면 null. */
export const leadingOption = (poll: Poll): PollOption | null =>
  poll.options.length > 0 ? [...poll.options].sort((a, b) => b.voteCount - a.voteCount)[0]! : null;

/** 득표순 정렬 옵션 사본 (원본 순서를 보존하며 동률은 안정 정렬). */
export const optionsByVotes = (poll: Poll): PollOption[] =>
  poll.options
    .map((option, index) => ({ option, index }))
    .sort((a, b) => b.option.voteCount - a.option.voteCount || a.index - b.index)
    .map((entry) => entry.option);
