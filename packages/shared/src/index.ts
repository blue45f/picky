import { z } from 'zod';

export const CreatePollSchema = z.object({
  question: z
    .string()
    .min(2, '질문은 최소 2글자 이상이어야 합니다.')
    .max(100, '질문은 최대 100글자 이하이어야 합니다.'),
  description: z.string().max(500, '설명은 최대 500글자 이하이어야 합니다.').optional().nullable(),
  options: z
    .array(
      z.object({
        text: z.string().min(1, '선택지는 빈 칸일 수 없습니다.'),
        imageUrl: z.string().optional().nullable(),
      }),
    )
    .min(2, '최소 2개 이상의 선택지가 필요합니다.')
    .max(10, '최대 10개까지의 선택지만 등록 가능합니다.'),
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

export interface Poll {
  id: string;
  question: string;
  description?: string | null;
  options: PollOption[];
  comments: PollComment[];
  createdAt: string;
  totalVotes: number;
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
