import { z } from 'zod';

export const CreatePollSchema = z.object({
  question: z
    .string()
    .min(2, '질문은 최소 2글자 이상이어야 합니다.')
    .max(100, '질문은 최대 100글자 이하이어야 합니다.'),
  description: z.string().max(500, '설명은 최대 500글자 이하이어야 합니다.').optional().nullable(),
  options: z
    .array(z.string().min(1, '선택지는 빈 칸일 수 없습니다.'))
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
}
