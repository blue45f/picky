import { z } from 'zod';

// 공유 브랜드(마스코트·카테고리·말투) — web/toss 두 앱이 같은 결을 쓰도록 재수출한다.
export * from './brand';

// web/toss 공유 순수 로직(토크나이저·시그널·준비도·카운트다운·옵션 헬퍼·포맷).
export * from './keywords';
export * from './poll';
export * from './pollSignal';
export * from './pollReadiness';
export * from './countdown';
export * from './format';

// 결과 해석/공유 순수 로직 — web/toss가 동일 점수·문구·구조를 쓰도록 단일화.
export * from './pollConfidence';
export * from './decisionMemo';
export * from './pollReport';
export * from './snsPreview';
export * from './pollNarrative';

// 공유 텍스트·오리진 정규화 코어(앱별 URL resolver 는 각 앱 lib/pollShare.ts 에 둠).
export * from './pollShare';

export const PollResultsVisibilitySchema = z.enum(['afterVote', 'always']);

export type PollResultsVisibility = z.infer<typeof PollResultsVisibilitySchema>;

/**
 * 투표 공개 범위 — 특정 사람만 참여시키기 위한 접근 제어.
 * - public: 목록에 노출 + 누구나 참여
 * - unlisted: 목록 비노출, 링크 아는 사람만 참여(링크 공유 전용)
 * - private: 접근 코드를 아는 사람만 열람·참여
 */
export const PollVisibilitySchema = z.enum(['public', 'unlisted', 'private']);

export type PollVisibility = z.infer<typeof PollVisibilitySchema>;

/**
 * 공개 범위 셀렉터 옵션 — web/toss 두 앱이 같은 라벨·설명을 쓰도록 단일화한 상수.
 * label은 칩/세그먼트용(이모지 포함), description은 한 줄 안내.
 */
export const VISIBILITY_OPTIONS: ReadonlyArray<{
  value: PollVisibility;
  label: string;
  description: string;
}> = [
  { value: 'public', label: '공개 🌍', description: '목록에 노출되고 누구나 참여할 수 있어요.' },
  {
    value: 'unlisted',
    label: '링크전용 🔗',
    description: '목록엔 안 보이고, 링크를 받은 사람만 참여해요.',
  },
  {
    value: 'private',
    label: '비공개 🔒',
    description: '접근 코드를 아는 사람만 참여할 수 있어요.',
  },
];

/** value가 PollVisibility인지 좁히는 타입 가드(쿼리·드래프트 복원 등에서 사용). */
export const isPollVisibility = (value: unknown): value is PollVisibility =>
  value === 'public' || value === 'unlisted' || value === 'private';

/**
 * 작성 화면 마감 프리셋 — web/toss 공통(없음/6시간/1일/3일/1주/직접선택).
 * ms<=0 은 마감 없음(none) 또는 직접 선택(custom)을 뜻한다.
 */
export type DeadlinePreset = 'none' | '6h' | '1d' | '3d' | '1w' | 'custom';

export const DEADLINE_PRESETS: ReadonlyArray<{
  value: DeadlinePreset;
  label: string;
  ms: number;
}> = [
  { value: 'none', label: '마감 없음 🌈', ms: 0 },
  { value: '6h', label: '6시간 ⏰', ms: 6 * 3_600_000 },
  { value: '1d', label: '1일 📅', ms: 24 * 3_600_000 },
  { value: '3d', label: '3일 ⌛️', ms: 3 * 24 * 3_600_000 },
  { value: '1w', label: '1주 🗓️', ms: 7 * 24 * 3_600_000 },
  { value: 'custom', label: '직접 선택 ✏️', ms: -1 },
];

/**
 * 마감 프리셋(value)을 지금 기준 마감 ISO 문자열로 환산하는 순수 계산.
 * - ms<=0 (none/custom) 또는 미지정 프리셋 → null(마감 없음/직접 선택)
 * - 그 외 → new Date(Date.now() + ms).toISOString()
 * web/toss가 같은 ms→ISO 규약을 쓰도록 단일화(세트 라벨은 앱별로 둘 수 있다).
 */
export const resolveDeadlinePresetEndsAt = (preset: DeadlinePreset): string | null => {
  const entry = DEADLINE_PRESETS.find((item) => item.value === preset);
  if (!entry || entry.ms <= 0) {
    return null;
  }
  return new Date(Date.now() + entry.ms).toISOString();
};

/**
 * 작성/수정 폼 입력 한도 — CreatePollSchema/UpdatePollSchema 의 수치와 동일한 단일 소스.
 * web/toss 두 앱의 로컬 상수(QUESTION_MAX 등) 드리프트를 막고, 웹 이미지 한도(과거 140KB)를
 * 스키마 한도(160KB)와 정합시킨다.
 */
export const POLL_LIMITS = {
  QUESTION_MAX: 100,
  DESC_MAX: 500,
  OPTION_TEXT_MAX: 60,
  OPTIONS_MIN: 2,
  OPTIONS_MAX: 10,
  IMAGE_DATA_URL_MAX: 160_000,
} as const;

/** 비공개(private) 투표의 접근 코드. 4~20자. */
export const PollAccessCodeSchema = z
  .string()
  .trim()
  .min(4, '접근 코드는 최소 4자 이상이어야 합니다.')
  .max(20, '접근 코드는 최대 20자 이하이어야 합니다.');

export const PollAttachmentSchema = z.object({
  name: z
    .string()
    .min(1, '첨부파일 이름은 필수입니다.')
    .max(120, '첨부파일 이름은 120자 이하이어야 합니다.'),
  type: z.string().max(80, '첨부파일 형식은 80자 이하이어야 합니다.'),
  size: z
    .number()
    .int()
    .min(1, '첨부파일 크기가 올바르지 않습니다.')
    .max(300_000, '첨부파일은 300KB 이하만 등록할 수 있습니다.'),
  dataUrl: z.string().max(420_000, '첨부파일 데이터는 파일당 420KB 이하이어야 합니다.'),
});

export const CreatePollSchema = z.object({
  question: z
    .string()
    .min(2, '질문은 최소 2글자 이상이어야 합니다.')
    .max(POLL_LIMITS.QUESTION_MAX, '질문은 최대 100글자 이하이어야 합니다.'),
  description: z
    .string()
    .max(POLL_LIMITS.DESC_MAX, '설명은 최대 500글자 이하이어야 합니다.')
    .optional()
    .nullable(),
  endsAt: z.string().datetime('마감 시간 형식이 올바르지 않습니다.').optional().nullable(),
  resultsVisibility: PollResultsVisibilitySchema.optional().nullable(),
  visibility: PollVisibilitySchema.optional(),
  accessCode: PollAccessCodeSchema.optional().nullable(),
  options: z
    .array(
      z.object({
        text: z.string().min(1, '선택지는 빈 칸일 수 없습니다.'),
        imageUrl: z
          .string()
          .max(POLL_LIMITS.IMAGE_DATA_URL_MAX, '이미지 데이터는 선택지당 160KB 이하이어야 합니다.')
          .optional()
          .nullable(),
      }),
    )
    .min(POLL_LIMITS.OPTIONS_MIN, '최소 2개 이상의 선택지가 필요합니다.')
    .max(POLL_LIMITS.OPTIONS_MAX, '최대 10개까지의 선택지만 등록 가능합니다.'),
  attachments: z
    .array(PollAttachmentSchema)
    .max(3, '첨부파일은 최대 3개까지 등록 가능합니다.')
    .optional()
    .nullable(),
  categoryId: z.string().optional().nullable(),
});

export type CreatePollInput = z.infer<typeof CreatePollSchema>;

/**
 * 등록한 고민(투표)을 수정할 때 쓰는 스키마.
 * 모든 필드가 선택값이라 부분 수정(PATCH)을 허용하고, 최소 한 필드는 보내야 한다.
 * 선택지 개수 변경 가능 여부(투표 시작 후 금지)는 서버 비즈니스 규칙에서 강제한다.
 */
export const UpdatePollSchema = z
  .object({
    question: z
      .string()
      .min(2, '질문은 최소 2글자 이상이어야 합니다.')
      .max(POLL_LIMITS.QUESTION_MAX, '질문은 최대 100글자 이하이어야 합니다.')
      .optional(),
    description: z
      .string()
      .max(POLL_LIMITS.DESC_MAX, '설명은 최대 500글자 이하이어야 합니다.')
      .optional()
      .nullable(),
    endsAt: z.string().datetime('마감 시간 형식이 올바르지 않습니다.').optional().nullable(),
    resultsVisibility: PollResultsVisibilitySchema.optional().nullable(),
    visibility: PollVisibilitySchema.optional(),
    accessCode: PollAccessCodeSchema.optional().nullable(),
    options: z
      .array(
        z.object({
          text: z.string().min(1, '선택지는 빈 칸일 수 없습니다.'),
          imageUrl: z
            .string()
            .max(
              POLL_LIMITS.IMAGE_DATA_URL_MAX,
              '이미지 데이터는 선택지당 160KB 이하이어야 합니다.',
            )
            .optional()
            .nullable(),
        }),
      )
      .min(POLL_LIMITS.OPTIONS_MIN, '최소 2개 이상의 선택지가 필요합니다.')
      .max(POLL_LIMITS.OPTIONS_MAX, '최대 10개까지의 선택지만 등록 가능합니다.')
      .optional(),
    attachments: z
      .array(PollAttachmentSchema)
      .max(3, '첨부파일은 최대 3개까지 등록 가능합니다.')
      .optional()
      .nullable(),
    categoryId: z.string().optional().nullable(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: '수정할 내용이 없습니다.',
  });

export type UpdatePollInput = z.infer<typeof UpdatePollSchema>;

/**
 * 게스트 댓글 선택적 비밀번호 길이 한도.
 * - COMMENT_PASSWORD_MIN: 신규 비번 설정(생성) 최소 길이. 보안 강화를 위해 6자로 올렸다.
 * - COMMENT_PASSWORD_VERIFY_MIN: 기존 비번 검증(수정/삭제) 최소 길이. 4자로 만든 레거시 비번도
 *   계속 본인 확인이 되도록 옛 하한(4)을 유지한다(상향은 신규 입력에만 적용).
 */
export const COMMENT_PASSWORD_MIN = 6;
export const COMMENT_PASSWORD_VERIFY_MIN = 4;
export const COMMENT_PASSWORD_MAX = 20;

/**
 * 신규 게스트 댓글 비밀번호 스키마(설정용, 6~20자).
 * 비번을 설정해 두면 voterKey(기기 고정)와 무관하게 어느 기기서든 본인 수정/삭제가 가능하다.
 * 비번 원문은 POST/PATCH/DELETE 바디로만 보내고(GET 쿼리 금지), 응답에는 hash·원문 모두 절대 노출하지 않는다.
 */
export const CommentPasswordSchema = z
  .string()
  .min(COMMENT_PASSWORD_MIN, `비밀번호는 최소 ${COMMENT_PASSWORD_MIN}자 이상이어야 해요.`)
  .max(COMMENT_PASSWORD_MAX, `비밀번호는 최대 ${COMMENT_PASSWORD_MAX}자 이하여야 해요.`);

/**
 * 기존 비밀번호 검증용 스키마(수정/삭제, 4~20자).
 * 신규 하한(6)을 그대로 쓰면 4~5자 레거시 비번 소유자가 본인 댓글을 관리할 수 없게 되므로,
 * 검증 경로는 옛 하한(4)을 유지한다 — 길이 강화는 신규 설정에만 적용하고 기존 검증엔 영향이 없다.
 */
export const CommentPasswordVerifySchema = z
  .string()
  .min(
    COMMENT_PASSWORD_VERIFY_MIN,
    `비밀번호는 최소 ${COMMENT_PASSWORD_VERIFY_MIN}자 이상이어야 해요.`,
  )
  .max(COMMENT_PASSWORD_MAX, `비밀번호는 최대 ${COMMENT_PASSWORD_MAX}자 이하여야 해요.`);

export const VoteSchema = z.object({
  optionId: z.number({ required_error: '선택할 옵션 ID가 필요합니다.' }),
  voterName: z
    .string()
    .max(20, '투표자 닉네임은 최대 20자 이하이어야 합니다.')
    .optional()
    .nullable(),
  comment: z.string().max(100, '의견은 최대 100자 이하이어야 합니다.').optional().nullable(),
  /**
   * 서버측 1인1표 식별키. 안정적 익명 키(토스 getAnonymousKey 해시 / 웹 localStorage UUID)를 보내면
   * (pollId, voterKey) 단위로 재투표를 막는다. 없으면(레거시·키 미지원) 기존처럼 허용한다.
   */
  voterKey: z.string().max(256, '식별키가 너무 깁니다.').optional().nullable(),
  /**
   * 투표 시 남긴 한마디(comment)에 설정할 선택적 관리 비밀번호(4~20자). comment 가 있을 때만 의미가 있다.
   * 설정하면 voterKey(기기 고정)와 무관하게 어느 기기서든 본인 수정/삭제가 가능해진다(서버는 해시로만 저장).
   * 미설정 시 기존 voterKey 경로 그대로라 마찰이 없다. 비번 원문은 응답에 절대 노출하지 않는다.
   */
  password: CommentPasswordSchema.optional().nullable(),
});

export type VoteInput = z.infer<typeof VoteSchema>;

/** 한마디(댓글)·답글 작성 입력. 투표와 무관하게 댓글/대댓글을 달 수 있다. */
export const CreateCommentSchema = z.object({
  comment: z.string().trim().min(1, '한마디를 입력해 주세요.').max(100, '한마디는 최대 100자예요.'),
  voterName: z.string().trim().max(20, '닉네임은 최대 20자예요.').optional().nullable(),
  /** 대댓글: 답글을 달 부모 댓글 id. 최상위 댓글이면 생략. */
  parentId: z.number().int().positive().optional().nullable(),
  /**
   * 멱등키 — 클라가 한 번의 제출마다 새로 만드는 uuid. (poll_id, client_comment_id) DB 유니크로
   * 동시 중복 POST(연타·StrictMode 이중 호출·네트워크 재시도)를 원자적으로 한 건으로 만든다.
   * 충돌이면 서버는 새 댓글을 만들지 않고 기존 상태를 멱등 반환한다. 미전송(레거시)이면 기존 시간창 dedup만 적용.
   */
  clientCommentId: z.string().uuid('잘못된 멱등키 형식입니다.').optional().nullable(),
  /**
   * 비회원 작성자 안정 식별키(vote의 voterKey와 동일). 회원이면 JWT userId가 우선이라 생략 가능.
   * 서버가 이 값을 댓글의 authorKey로 저장해 두면, 나중에 같은 키로 본인 수정/삭제를 허용한다.
   * authorKey 원문은 응답에 절대 노출하지 않는다(voterKey처럼 비밀).
   */
  voterKey: z.string().max(256, '식별키가 너무 깁니다.').optional().nullable(),
  /**
   * 게스트가 다른 기기서도 본인 댓글을 관리하려고 설정하는 선택적 비밀번호(4~20자).
   * 설정하지 않으면(미전송) 기존 voterKey 경로 그대로라 마찰이 없다. 서버는 해시로만 저장한다.
   * 비번 원문은 응답에 절대 노출하지 않는다(hash·존재여부(hasPassword)만 다룬다).
   */
  password: CommentPasswordSchema.optional().nullable(),
});

export type CreateCommentInput = z.infer<typeof CreateCommentSchema>;

/**
 * 댓글 수정 입력 — 작성자 본인만(authorId===userId OR authorKey===voterKey OR 비번 일치) 텍스트를 고칠 수 있다.
 * 작성자/원시각은 불변, 텍스트만 교체하고 editedAt이 갱신된다.
 */
export const EditCommentSchema = z.object({
  comment: z.string().trim().min(1, '한마디를 입력해 주세요.').max(100, '한마디는 최대 100자예요.'),
  /** 비회원 본인 확인용 식별키. 회원이면 JWT userId로 판정하므로 생략 가능. 응답 비노출. */
  voterKey: z.string().max(256, '식별키가 너무 깁니다.').optional().nullable(),
  /**
   * 게스트가 비번을 설정한 댓글을 다른 기기서 수정할 때 보내는 비밀번호 원문(검증용 4~20자).
   * 서버가 저장된 해시와 대조해 일치하면 본인으로 인정한다. 레거시 4자 비번 호환을 위해 검증 하한은 4. 응답 비노출.
   */
  password: CommentPasswordVerifySchema.optional().nullable(),
});

export type EditCommentInput = z.infer<typeof EditCommentSchema>;

/** 댓글 삭제 바디 — 비회원 본인 확인용 voterKey를 POST/DELETE 바디로 전송(GET 쿼리 누출 방지). 응답 비노출. */
export const DeleteCommentSchema = z.object({
  /** 비회원 본인 확인용 식별키. 회원이면 JWT userId로 판정하므로 생략 가능. 폴 소유자/어드민은 불필요. */
  voterKey: z.string().max(256, '식별키가 너무 깁니다.').optional().nullable(),
  /**
   * 게스트가 비번을 설정한 댓글을 다른 기기서 삭제할 때 보내는 비밀번호 원문(검증용 4~20자).
   * 서버가 저장된 해시와 대조해 일치하면 본인으로 인정한다. 레거시 4자 비번 호환을 위해 검증 하한은 4. 응답 비노출.
   */
  password: CommentPasswordVerifySchema.optional().nullable(),
});

export type DeleteCommentInput = z.infer<typeof DeleteCommentSchema>;

export interface PollOption {
  id: number;
  text: string;
  voteCount: number;
  imageUrl?: string | null;
}

export interface PollComment {
  id: number;
  voterName: string;
  comment: string;
  createdAt: string;
  selectedOptionId?: number;
  selectedOptionText?: string;
  /** 대댓글: 부모 댓글 id. 최상위 댓글이면 null/미설정. */
  parentId?: number | null;
  /** 본인이 댓글을 수정한 시각(ISO). 한 번도 수정 안 했으면 null/미설정. 공개 표시값. */
  editedAt?: string | null;
  /**
   * 게스트가 이 댓글에 관리 비밀번호를 설정했는지(불리언만 — 해시·원문은 절대 노출 금지).
   * 프론트는 이 값으로 voterKey 불일치(다른 기기)일 때 자물쇠 어포던스(비번 입력)를 띄운다.
   */
  hasPassword?: boolean;
}

export type PollAttachment = z.infer<typeof PollAttachmentSchema>;

export interface Poll {
  id: string;
  question: string;
  description?: string | null;
  options: PollOption[];
  comments: PollComment[];
  attachments?: PollAttachment[];
  createdAt: string;
  endsAt?: string | null;
  totalVotes: number;
  resultsVisibility?: PollResultsVisibility | null;
  /** 공개 범위(기본 public). private/unlisted면 목록 비노출·접근 제어. */
  visibility?: PollVisibility | null;
  /** private 투표라 접근 코드 입력이 필요한지. accessCode 원문은 응답에 절대 포함하지 않음. */
  requiresCode?: boolean;
  creatorId?: string | null;
  creatorIsGuest?: boolean;
  /**
   * 작성자(회원/게스트) 표시용 닉네임. creatorId→users.nickname 으로 서버가 해석해 넣는다.
   * 작성자가 없거나(익명) 사용자를 못 찾으면 null. 단건 상세 응답에만 채우고 목록엔 비운다.
   * voterKey/accessCode 같은 비밀 메타와 달리 닉네임은 공개 표시값이라 노출해도 안전하다.
   */
  creatorNickname?: string | null;
  categoryId?: string | null;
}

/** 목록 페이지네이션 질의 한계값. limit는 1~50, 기본 20. page는 1-base, 기본 1. */
export const POLLS_PAGE_DEFAULT_LIMIT = 20;
export const POLLS_PAGE_MAX_LIMIT = 50;

/**
 * 목록 정렬 키(서버측 ORDER BY 매핑). 기존 클라 정렬 옵션과 1:1 대응한다.
 * - latest: 최신순(createdAt desc)
 * - popular: 투표 많은순(totalVotes desc)
 * - commented: 댓글 많은순(comments count desc)
 * - closing: 마감 임박순(열린 것 우선, 마감 가까운 순)
 */
export const PollListSortSchema = z.enum(['latest', 'popular', 'commented', 'closing']);
export type PollListSort = z.infer<typeof PollListSortSchema>;

/**
 * 목록 정렬 셀렉터 옵션 — web/toss 두 앱이 같은 4종·같은 라벨을 쓰도록 단일화한 상수.
 * 서버 PollListSort 4종과 1:1 대응한다(웹은 closing 누락, 토스는 commented 누락이던 드리프트 해소).
 */
export const SORT_OPTIONS: ReadonlyArray<{ value: PollListSort; label: string }> = [
  { value: 'latest', label: '최신순' },
  { value: 'popular', label: '투표 많은순' },
  { value: 'commented', label: '댓글 많은순' },
  { value: 'closing', label: '마감 임박순' },
];

/** 목록 진행 상태 필터. open=마감 전, closed=마감됨, all=전체. */
export const PollListStatusSchema = z.enum(['all', 'open', 'closed']);
export type PollListStatus = z.infer<typeof PollListStatusSchema>;

/** GET /polls 서버측 검색/정렬/필터 질의(페이지네이션 포함). 전부 선택값 — 누락 시 기본값. */
export interface PollListQuery {
  page: number;
  limit: number;
  q: string;
  sort: PollListSort;
  status: PollListStatus;
  category: string | null;
}

/**
 * GET /polls 페이지네이션 응답 봉투.
 * 기존엔 Poll[] 배열을 그대로 돌려줬지만, 목록 급증에 대비해 서버측 LIMIT/OFFSET로 잘라서 준다.
 */
export interface PaginatedPolls {
  items: Poll[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

export const RegisterSchema = z
  .object({
    email: z
      .string({ required_error: '이메일은 필수입니다.' })
      .trim()
      .email('올바른 이메일 형식이 아닙니다.'),
    password: z
      .string({ required_error: '비밀번호는 필수입니다.' })
      .min(6, '비밀번호는 최소 6자 이상이어야 합니다.'),
    nickname: z
      .string()
      .trim()
      .min(2, '닉네임은 최소 2자 이상이어야 합니다.')
      .max(20, '닉네임은 최대 20자 이하이어야 합니다.')
      .optional(),
    name: z
      .string()
      .trim()
      .min(2, '닉네임은 최소 2자 이상이어야 합니다.')
      .max(20, '닉네임은 최대 20자 이하이어야 합니다.')
      .optional(),
  })
  .superRefine((value, ctx) => {
    const resolved = value.nickname ?? value.name;
    if (!resolved?.trim()) {
      ctx.addIssue({
        code: 'custom',
        message: '닉네임은 최소 2자 이상이어야 합니다.',
        path: ['nickname'],
      });
    }
  })
  .transform(({ email, password, nickname, name }) => ({
    email,
    password,
    nickname: (nickname ?? name ?? '').trim(),
  }));

export type RegisterInput = z.infer<typeof RegisterSchema>;

export const LoginSchema = z.object({
  email: z
    .string({ required_error: '이메일은 필수입니다.' })
    .trim()
    .email('올바른 이메일 형식이 아닙니다.'),
  password: z
    .string({ required_error: '비밀번호는 필수입니다.' })
    .min(6, '비밀번호는 최소 6자 이상이어야 합니다.'),
});

export type LoginInput = z.infer<typeof LoginSchema>;

export const GuestRegisterSchema = z.object({
  nickname: z
    .string({ required_error: '닉네임은 필수입니다.' })
    .trim()
    .min(2, '닉네임은 최소 2자 이상이어야 합니다.')
    .max(20, '닉네임은 최대 20자 이하이어야 합니다.'),
});

export type GuestRegisterInput = z.infer<typeof GuestRegisterSchema>;

export interface UserProfile {
  id: string;
  email: string;
  nickname: string;
  createdAt: string;
  isGuest?: boolean;
  /** 운영자(어드민) 여부 — ADMIN_EMAILS 환경변수로 지정된 계정이면 true. */
  isAdmin?: boolean;
}

export interface AuthResult {
  accessToken: string;
  user: UserProfile;
}

/** 앱인토스 비게임 미니앱 getAnonymousKey(hash) 기반 식별 로그인. 서버/mTLS 불필요. */
export const TossIdentitySchema = z.object({
  anonymousKey: z
    .string({ required_error: '토스 사용자 식별키가 필요합니다.' })
    .trim()
    .min(8, '유효하지 않은 식별키입니다.')
    .max(256, '유효하지 않은 식별키입니다.'),
  nickname: z
    .string()
    .trim()
    .max(20, '닉네임은 최대 20자 이하이어야 합니다.')
    .optional()
    .nullable(),
});

export type TossIdentityInput = z.infer<typeof TossIdentitySchema>;

/** 앱인토스 토스 로그인 appLogin 인가 코드 기반(서버 mTLS 토큰 교환) 로그인. */
export const TossLoginSchema = z.object({
  authorizationCode: z
    .string({ required_error: '인가 코드가 필요합니다.' })
    .trim()
    .min(1, '인가 코드가 필요합니다.'),
  referrer: z.string().trim().min(1).optional().nullable(),
});

export type TossLoginInput = z.infer<typeof TossLoginSchema>;
