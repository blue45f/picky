// 이 파일은 packages/shared/src/index.ts 의 복사본이에요(앱인토스 .ait 번들이
// workspace:* 패키지를 처리하지 못해 벤더링). 원본 변경 시 `pnpm sync:toss-shared` 로 갱신하세요.
import { z } from 'zod';

export const PollResultsVisibilitySchema = z.enum(['afterVote', 'always']);

export type PollResultsVisibility = z.infer<typeof PollResultsVisibilitySchema>;

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
  creatorId?: string | null;
  creatorIsGuest?: boolean;
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
    if (!resolved || !resolved.trim()) {
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
