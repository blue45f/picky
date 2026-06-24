import { z } from 'zod';

// 공유 브랜드(마스코트·카테고리·말투) — web/toss 두 앱이 같은 결을 쓰도록 재수출한다.
export * from './brand';

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
    .max(100, '질문은 최대 100글자 이하이어야 합니다.'),
  description: z.string().max(500, '설명은 최대 500글자 이하이어야 합니다.').optional().nullable(),
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
          .max(160_000, '이미지 데이터는 선택지당 160KB 이하이어야 합니다.')
          .optional()
          .nullable(),
      }),
    )
    .min(2, '최소 2개 이상의 선택지가 필요합니다.')
    .max(10, '최대 10개까지의 선택지만 등록 가능합니다.'),
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
      .max(100, '질문은 최대 100글자 이하이어야 합니다.')
      .optional(),
    description: z
      .string()
      .max(500, '설명은 최대 500글자 이하이어야 합니다.')
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
            .max(160_000, '이미지 데이터는 선택지당 160KB 이하이어야 합니다.')
            .optional()
            .nullable(),
        }),
      )
      .min(2, '최소 2개 이상의 선택지가 필요합니다.')
      .max(10, '최대 10개까지의 선택지만 등록 가능합니다.')
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

export const VoteSchema = z.object({
  optionId: z.number({ required_error: '선택할 옵션 ID가 필요합니다.' }),
  voterName: z
    .string()
    .max(20, '투표자 닉네임은 최대 20자 이하이어야 합니다.')
    .optional()
    .nullable(),
  comment: z.string().max(100, '의견은 최대 100자 이하이어야 합니다.').optional().nullable(),
});

export type VoteInput = z.infer<typeof VoteSchema>;

/** 한마디(댓글)·답글 작성 입력. 투표와 무관하게 댓글/대댓글을 달 수 있다. */
export const CreateCommentSchema = z.object({
  comment: z.string().trim().min(1, '한마디를 입력해 주세요.').max(100, '한마디는 최대 100자예요.'),
  voterName: z.string().trim().max(20, '닉네임은 최대 20자예요.').optional().nullable(),
  /** 대댓글: 답글을 달 부모 댓글 id. 최상위 댓글이면 생략. */
  parentId: z.number().int().positive().optional().nullable(),
});

export type CreateCommentInput = z.infer<typeof CreateCommentSchema>;

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
  categoryId?: string | null;
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
