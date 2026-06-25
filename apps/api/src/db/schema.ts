import { pgTable, text, boolean, integer, timestamp, jsonb, serial } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Users table
export const users = pgTable('users', {
  id: text('id').primaryKey(), // UUID or guest ID
  // 익명/게스트/토스 사용자는 email='' 라서 전역 UNIQUE를 쓰지 않는다(2번째 익명 사용자부터 충돌 방지).
  // 실제 이메일의 유일성은 부분 유니크 인덱스(WHERE email <> '')로 보장한다 — database.service onModuleInit.
  email: text('email').notNull(),
  passwordHash: text('password_hash').notNull(),
  salt: text('salt').notNull(),
  nickname: text('nickname').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  isGuest: boolean('is_guest').default(false).notNull(),
});

// Polls table
export const polls = pgTable('polls', {
  id: text('id').primaryKey(), // 6-character unique short ID
  question: text('question').notNull(),
  description: text('description'),
  // 고민 카테고리(@picky/shared POLL_CATEGORIES id). nullable·비파괴 — 기존 행/배포에 영향 없음.
  categoryId: text('category_id'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  endsAt: timestamp('ends_at'),
  totalVotes: integer('total_votes').default(0).notNull(),
  resultsVisibility: text('results_visibility').default('afterVote').notNull(), // 'afterVote' | 'always'
  creatorId: text('creator_id'),
  creatorIsGuest: boolean('creator_is_guest').default(true).notNull(),
  attachments: jsonb('attachments').default([]).notNull(),
  // 공개 범위(public/unlisted/private) + 비공개 접근 코드. nullable/default라 비파괴.
  visibility: text('visibility').default('public').notNull(),
  accessCode: text('access_code'),
});

// Poll options table
export const pollOptions = pgTable('poll_options', {
  id: serial('id').primaryKey(),
  pollId: text('poll_id')
    .references(() => polls.id, { onDelete: 'cascade' })
    .notNull(),
  optionIndex: integer('option_index').notNull(), // 1-indexed option ID for client API compatibility
  text: text('text').notNull(),
  voteCount: integer('vote_count').default(0).notNull(),
  imageUrl: text('image_url'),
});

// Poll comments table
export const pollComments = pgTable('poll_comments', {
  id: serial('id').primaryKey(),
  pollId: text('poll_id')
    .references(() => polls.id, { onDelete: 'cascade' })
    .notNull(),
  voterName: text('voter_name').default('익명').notNull(),
  comment: text('comment').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  selectedOptionId: integer('selected_option_id'),
  selectedOptionText: text('selected_option_text'),
  // 대댓글: 부모 댓글 id (최상위면 null). 비파괴 추가.
  parentId: integer('parent_id'),
  // 작성자 식별값 — 본인 수정/삭제 권한 판정용. 둘 다 비밀(응답에 절대 노출 금지).
  // authorId: 회원 JWT userId, authorKey: 비회원 안정 식별키(voterKey). 레거시 댓글은 둘 다 null.
  authorId: text('author_id'),
  authorKey: text('author_key'),
  // 본인이 댓글을 수정한 시각. 한 번도 수정 안 했으면 null. 공개 표시값.
  editedAt: timestamp('edited_at'),
  // 게스트 댓글 선택적 관리 비밀번호 해시(salt:hash, pbkdf2). 미설정이면 null.
  // 비밀 — 응답에 절대 노출 금지(hasPassword 불리언만 파생). 비번 일치 시 다른 기기서도 본인 인정.
  passwordHash: text('password_hash'),
});

// Poll votes table — 서버측 1인1표. (poll_id, voter_key) 유니크로 재투표를 막는다.
// voter_key 는 안정적 익명 키(토스 getAnonymousKey 해시 / 웹 localStorage UUID). 비파괴 추가.
export const pollVotes = pgTable('poll_votes', {
  id: serial('id').primaryKey(),
  pollId: text('poll_id')
    .references(() => polls.id, { onDelete: 'cascade' })
    .notNull(),
  voterKey: text('voter_key').notNull(),
  optionIndex: integer('option_index').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Relations definitions
export const usersRelations = relations(users, ({ many }) => ({
  polls: many(polls),
}));

export const pollsRelations = relations(polls, ({ one, many }) => ({
  creator: one(users, {
    fields: [polls.creatorId],
    references: [users.id],
  }),
  options: many(pollOptions),
  comments: many(pollComments),
}));

export const pollOptionsRelations = relations(pollOptions, ({ one }) => ({
  poll: one(polls, {
    fields: [pollOptions.pollId],
    references: [polls.id],
  }),
}));

export const pollCommentsRelations = relations(pollComments, ({ one }) => ({
  poll: one(polls, {
    fields: [pollComments.pollId],
    references: [polls.id],
  }),
}));

export const pollVotesRelations = relations(pollVotes, ({ one }) => ({
  poll: one(polls, {
    fields: [pollVotes.pollId],
    references: [polls.id],
  }),
}));
