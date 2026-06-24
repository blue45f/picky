import { pgTable, text, boolean, integer, timestamp, jsonb, serial } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Users table
export const users = pgTable('users', {
  id: text('id').primaryKey(), // UUID or guest ID
  email: text('email').notNull().unique(),
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
