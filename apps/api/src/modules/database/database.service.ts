import { Injectable, OnModuleInit, ServiceUnavailableException } from '@nestjs/common';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { Poll } from '@picky/shared';
import { get as getBlob, put as putBlob } from '@vercel/blob';
import { createClient, type VercelKV } from '@vercel/kv';
import { Pool } from 'pg';
import { db, pool } from '../../db/index';
import * as schema from '../../db/schema';
import { eq, desc, sql } from 'drizzle-orm';

interface DatabaseState {
  polls: Poll[];
  users: DatabaseUser[];
}

interface DatabaseStorageClient {
  get<T = unknown>(key: string): Promise<T | null>;
  set(key: string, value: DatabaseState): Promise<unknown>;
}

export interface DatabaseUser {
  id: string;
  email: string;
  passwordHash: string;
  salt: string;
  nickname: string;
  createdAt: string;
  isGuest: boolean;
}

@Injectable()
export class DatabaseService implements OnModuleInit {
  private readonly storageKey = 'picky:database:v1';
  private readonly blobPath = 'picky/database/v1.json';
  private readonly filePath = path.resolve(
    process.env.PICKY_DB_PATH?.trim() || path.resolve(process.cwd(), 'db.json'),
  );
  private readonly useSqlDb = Boolean(process.env.DATABASE_URL?.trim());
  private readonly storageClient: DatabaseStorageClient | null = this.createStorageClient();
  private readonly requiresDurableStorage =
    (process.env.NODE_ENV === 'production' ||
      process.env.VERCEL === '1' ||
      Boolean(process.env.VERCEL_ENV)) &&
    process.env.PICKY_ALLOW_EPHEMERAL_STORAGE !== 'true';
  private data: DatabaseState = { polls: [], users: [] };
  private initialized = false;

  async onModuleInit() {
    if (this.useSqlDb) {
      try {
        await pool.query(`
          CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            email TEXT NOT NULL UNIQUE,
            password_hash TEXT NOT NULL,
            salt TEXT NOT NULL,
            nickname TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT NOW() NOT NULL,
            is_guest BOOLEAN DEFAULT FALSE NOT NULL
          );
        `);
        await pool.query(`
          CREATE TABLE IF NOT EXISTS polls (
            id TEXT PRIMARY KEY,
            question TEXT NOT NULL,
            description TEXT,
            category_id TEXT,
            created_at TIMESTAMP DEFAULT NOW() NOT NULL,
            ends_at TIMESTAMP,
            total_votes INTEGER DEFAULT 0 NOT NULL,
            results_visibility TEXT DEFAULT 'afterVote' NOT NULL,
            visibility TEXT DEFAULT 'public' NOT NULL,
            access_code TEXT,
            creator_id TEXT,
            creator_is_guest BOOLEAN DEFAULT TRUE NOT NULL,
            attachments JSONB DEFAULT '[]'::jsonb NOT NULL
          );
        `);
        await pool.query(`
          CREATE TABLE IF NOT EXISTS poll_options (
            id SERIAL PRIMARY KEY,
            poll_id TEXT NOT NULL REFERENCES polls(id) ON DELETE CASCADE,
            option_index INTEGER NOT NULL,
            text TEXT NOT NULL,
            vote_count INTEGER DEFAULT 0 NOT NULL,
            image_url TEXT
          );
        `);
        await pool.query(`
          CREATE TABLE IF NOT EXISTS poll_comments (
            id SERIAL PRIMARY KEY,
            poll_id TEXT NOT NULL REFERENCES polls(id) ON DELETE CASCADE,
            voter_name TEXT DEFAULT '익명' NOT NULL,
            comment TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT NOW() NOT NULL,
            selected_option_id INTEGER,
            selected_option_text TEXT,
            parent_id INTEGER
          );
        `);
        // 기존 라이브 테이블에 신규 컬럼을 비파괴·멱등으로 추가한다.
        // CREATE TABLE IF NOT EXISTS는 이미 존재하는 테이블엔 컬럼을 더하지 않으므로 ALTER가 필요하다.
        await pool.query(`
          ALTER TABLE polls ADD COLUMN IF NOT EXISTS category_id TEXT;
          ALTER TABLE polls ADD COLUMN IF NOT EXISTS visibility TEXT DEFAULT 'public' NOT NULL;
          ALTER TABLE polls ADD COLUMN IF NOT EXISTS access_code TEXT;
          ALTER TABLE poll_comments ADD COLUMN IF NOT EXISTS parent_id INTEGER;
        `);
        console.log('✓ Drizzle PostgreSQL database tables verified/created successfully.');
      } catch (err) {
        console.error('Failed to initialize Drizzle tables in PostgreSQL:', err);
      }
      this.initialized = true;
      return;
    }

    try {
      await this.load();
    } catch (error) {
      if (this.requiresDurableStorage) {
        console.error('Durable storage is not ready. Requests will fail until it is configured.');
        return;
      }

      throw error;
    }
  }

  private createStorageClient(): DatabaseStorageClient | null {
    return (
      this.createPostgresStorageClient() ||
      this.createKvStorageClient() ||
      this.createBlobStorageClient()
    );
  }

  private createPostgresStorageClient(): DatabaseStorageClient | null {
    const databaseUrl = process.env.DATABASE_URL?.trim();
    if (!databaseUrl) {
      return null;
    }

    try {
      const isLocalhost = databaseUrl.includes('localhost') || databaseUrl.includes('127.0.0.1');
      const pool = new Pool({
        connectionString: databaseUrl,
        ssl: isLocalhost ? false : { rejectUnauthorized: false },
        max: 8,
        idleTimeoutMillis: 10000,
        connectionTimeoutMillis: 5000,
      });

      return {
        get: async <T = unknown>(key: string): Promise<T | null> => {
          try {
            await pool.query(`
              CREATE TABLE IF NOT EXISTS picky_storage (
                key VARCHAR(255) PRIMARY KEY,
                value JSONB NOT NULL
              );
            `);
            const res = await pool.query('SELECT value FROM picky_storage WHERE key = $1', [key]);
            if (res.rows.length === 0) {
              return null;
            }
            return res.rows[0].value as T;
          } catch (error) {
            console.error('Failed to read from PostgreSQL database:', error);
            return null;
          }
        },
        set: async (key: string, value: DatabaseState): Promise<unknown> => {
          try {
            await pool.query(`
              CREATE TABLE IF NOT EXISTS picky_storage (
                key VARCHAR(255) PRIMARY KEY,
                value JSONB NOT NULL
              );
            `);
            await pool.query(
              `
              INSERT INTO picky_storage (key, value)
              VALUES ($1, $2)
              ON CONFLICT (key) DO UPDATE
              SET value = EXCLUDED.value
            `,
              [key, JSON.stringify(value)],
            );
            return true;
          } catch (error) {
            console.error('Failed to write to PostgreSQL database:', error);
            throw error;
          }
        },
      };
    } catch (error) {
      console.error('Failed to initialize PostgreSQL connection pool:', error);
      return null;
    }
  }

  private createKvStorageClient(): DatabaseStorageClient | null {
    const url = process.env.KV_REST_API_URL?.trim();
    const token = process.env.KV_REST_API_TOKEN?.trim();
    if (!url || !token) {
      return null;
    }

    try {
      return createClient({ url, token }) as unknown as VercelKV;
    } catch {
      return null;
    }
  }

  private createBlobStorageClient(): DatabaseStorageClient | null {
    const hasReadWriteToken = Boolean(process.env.BLOB_READ_WRITE_TOKEN?.trim());
    const hasOidcStore = Boolean(
      process.env.VERCEL_OIDC_TOKEN?.trim() && process.env.BLOB_STORE_ID?.trim(),
    );
    if (!hasReadWriteToken && !hasOidcStore) {
      return null;
    }

    return {
      get: async <T = unknown>(_key: string): Promise<T | null> => {
        const result = await getBlob(this.blobPath, { access: 'private', useCache: false });
        if (result?.statusCode !== 200 || !result.stream) {
          return null;
        }

        const text = await new Response(result.stream).text();
        if (!text.trim()) {
          return null;
        }

        return JSON.parse(text) as T;
      },
      set: async (_key: string, value: DatabaseState): Promise<unknown> => {
        return putBlob(this.blobPath, JSON.stringify(value), {
          access: 'private',
          allowOverwrite: true,
          contentType: 'application/json',
          cacheControlMaxAge: 60,
        });
      },
    };
  }

  private createSeedData(): DatabaseState {
    return {
      polls: [
        {
          id: 'seed-onboarding-poll',
          question:
            'WebstormProjects 개인 프로젝트들 중 어떤 것을 가장 먼저 상용 서비스화 시킬까요?',
          description:
            '일상에서 고민되는 것들을 지인들에게 쉽게 물어보는 picky(피키) 서비스 출시를 축하하며, 다음 개인 프로젝트 중 하나를 상용 런칭하고 싶습니다. 여러분의 선택은?',
          options: [
            {
              id: 1,
              text: 'PromptMarket (프롬프트/에이전트 마켓)',
              voteCount: 15,
              imageUrl: null,
            },
            {
              id: 2,
              text: 'proto-live (바이브코딩 코드 공유 플랫폼)',
              voteCount: 12,
              imageUrl: 'https://images.unsplash.com/photo-1542831371-29b0f74f9713?w=400&q=80',
            },
            {
              id: 3,
              text: 'family-care-platform (실버 케어 매칭 서비스)',
              voteCount: 8,
              imageUrl: 'https://images.unsplash.com/photo-1576765608535-5f04d1e3f289?w=400&q=80',
            },
            {
              id: 4,
              text: 'orbit-ui (유려한 글라스모피즘 컴포넌트 킷)',
              voteCount: 19,
              imageUrl: 'https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?w=400&q=80',
            },
          ],
          comments: [
            {
              id: 1,
              voterName: '시니어FE',
              comment: 'PromptMarket이 요즘 AI 트렌드에 가장 정합해서 비즈니스 잠재력이 큽니다!',
              createdAt: new Date().toISOString(),
              selectedOptionId: 1,
              selectedOptionText: 'PromptMarket (프롬프트/에이전트 마켓)',
            },
            {
              id: 2,
              voterName: '김희준',
              comment:
                '역시 Orbit UI 가 유려한 컴포넌트 킷이라 디자이너들에게 인기가 많을 것 같네요.',
              createdAt: new Date().toISOString(),
              selectedOptionId: 4,
              selectedOptionText: 'orbit-ui (유려한 글라스모피즘 컴포넌트 킷)',
            },
          ],
          createdAt: new Date().toISOString(),
          totalVotes: 54,
        },
      ],
      users: [],
    };
  }

  private sanitizeEmails(value: string): string {
    return (value || '').trim().toLowerCase();
  }

  private sanitizeData(candidate: unknown): DatabaseState {
    const raw = candidate as Partial<DatabaseState>;
    const polls = Array.isArray(raw?.polls) ? raw?.polls : [];
    const users = Array.isArray(raw?.users)
      ? raw.users
          .filter(
            (user: any) => user && typeof user.id === 'string' && typeof user.email === 'string',
          )
          .map((user: any) => ({
            id: String(user.id),
            email: String(user.email || ''),
            passwordHash: String(user.passwordHash || ''),
            salt: String(user.salt || ''),
            nickname: String(user.nickname || ''),
            createdAt: String(user.createdAt || new Date().toISOString()),
            isGuest: Boolean(user.isGuest),
          }))
      : [];

    return {
      polls: polls
        .filter(
          (poll: any) => poll && typeof poll.id === 'string' && typeof poll.question === 'string',
        )
        .map((poll: any) => ({
          ...poll,
          options: Array.isArray(poll.options) ? poll.options : [],
          comments: Array.isArray(poll.comments) ? poll.comments : [],
          createdAt: String(poll.createdAt || new Date().toISOString()),
          totalVotes:
            typeof poll.totalVotes === 'number' ? poll.totalVotes : Number(poll.totalVotes) || 0,
        })),
      users: users.map((user) => ({
        ...user,
        email: this.sanitizeEmails(user.email),
      })),
    };
  }

  private async loadFromKv(): Promise<DatabaseState | null> {
    if (!this.storageClient) {
      return null;
    }

    const raw = await this.storageClient.get<DatabaseState>(this.storageKey);
    if (!raw) {
      return null;
    }

    return this.sanitizeData(raw);
  }

  private loadFromFile(): DatabaseState {
    try {
      if (!fs.existsSync(this.filePath)) {
        return this.createSeedData();
      }

      const fileContent = fs.readFileSync(this.filePath, 'utf-8');
      const parsed = JSON.parse(fileContent);
      const next = this.sanitizeData(parsed);
      if (next.polls.length === 0 && next.users.length === 0) {
        return this.createSeedData();
      }
      return next;
    } catch (error) {
      console.error('Failed to load JSON database, fallback seed initialized.', error);
      return this.createSeedData();
    }
  }

  private async saveToKv(nextState: DatabaseState) {
    if (!this.storageClient) {
      return;
    }

    await this.storageClient.set(this.storageKey, nextState);
  }

  private saveToFile(nextState: DatabaseState) {
    try {
      fs.writeFileSync(this.filePath, JSON.stringify(nextState, null, 2), 'utf-8');
    } catch (error) {
      console.error('Failed to save JSON database:', error);
    }
  }

  private async persist(nextState: DatabaseState) {
    if (this.storageClient) {
      try {
        await this.saveToKv(nextState);
        return;
      } catch (error) {
        console.error('Failed to persist with KV.', error);
        if (this.requiresDurableStorage) {
          throw new ServiceUnavailableException(
            '영속 저장소에 저장하지 못했습니다. Vercel Blob/KV 연결 상태를 확인해 주세요.',
          );
        }
      }
    }

    if (this.requiresDurableStorage) {
      throw new ServiceUnavailableException(
        'Production에는 영속 저장소가 필요합니다. BLOB_READ_WRITE_TOKEN 또는 KV_REST_API_URL/KV_REST_API_TOKEN을 설정해 주세요.',
      );
    }

    this.saveToFile(nextState);
  }

  private async load() {
    if (this.initialized) {
      return;
    }

    if (this.requiresDurableStorage && !this.storageClient) {
      throw new ServiceUnavailableException(
        'Production에는 영속 저장소가 필요합니다. BLOB_READ_WRITE_TOKEN 또는 KV_REST_API_URL/KV_REST_API_TOKEN을 설정해 주세요.',
      );
    }

    try {
      const loaded = await this.loadFromKv();
      if (loaded) {
        this.data = loaded;
      } else {
        this.data = this.loadFromFile();
        if (this.requiresDurableStorage && this.storageClient) {
          await this.saveToKv(this.data);
        }
      }
    } catch (error) {
      console.error('Failed to initialize database.', error);
      if (this.requiresDurableStorage) {
        throw new ServiceUnavailableException(
          '영속 저장소를 초기화하지 못했습니다. Vercel Blob/KV 연결 상태를 확인해 주세요.',
        );
      }
      this.data = this.loadFromFile();
    }

    this.initialized = true;
  }

  private async sync() {
    if (this.storageClient) {
      try {
        const latest = await this.loadFromKv();
        if (latest) {
          this.data = latest;
          return;
        }
      } catch (error) {
        if (this.requiresDurableStorage) {
          console.error('Failed to sync durable storage.', error);
          throw new ServiceUnavailableException(
            '영속 저장소와 동기화하지 못했습니다. Vercel Blob/KV 연결 상태를 확인해 주세요.',
          );
        }
      }
    }

    if (this.requiresDurableStorage) {
      throw new ServiceUnavailableException(
        'Production에는 영속 저장소가 필요합니다. BLOB_READ_WRITE_TOKEN 또는 KV_REST_API_URL/KV_REST_API_TOKEN을 설정해 주세요.',
      );
    }
  }

  private async refresh() {
    await this.load();
    await this.sync();
  }

  private async commit(nextState: DatabaseState) {
    await this.persist(nextState);
    this.data = nextState;
  }

  async getPolls(): Promise<Poll[]> {
    if (this.useSqlDb) {
      const rows = await db.query.polls.findMany({
        // 홈 목록은 공개(public) 투표만 — unlisted/private는 링크/코드로만 접근한다.
        where: eq(schema.polls.visibility, 'public'),
        orderBy: [desc(schema.polls.createdAt)],
        with: {
          options: {
            orderBy: (opt, { asc }) => [asc(opt.optionIndex)],
          },
          comments: {
            orderBy: (cmt, { asc }) => [asc(cmt.createdAt)],
          },
        },
      });
      return rows.map((r) => ({
        id: r.id,
        question: r.question,
        description: r.description,
        createdAt: r.createdAt.toISOString(),
        endsAt: r.endsAt ? r.endsAt.toISOString() : null,
        totalVotes: r.totalVotes,
        resultsVisibility: r.resultsVisibility as any,
        visibility: r.visibility as any,
        requiresCode: r.visibility === 'private',
        creatorId: r.creatorId,
        creatorIsGuest: r.creatorIsGuest,
        categoryId: r.categoryId,
        attachments: r.attachments as any,
        options: r.options.map((o) => ({
          id: o.optionIndex,
          text: o.text,
          voteCount: o.voteCount,
          imageUrl: o.imageUrl,
        })),
        comments: r.comments.map((c) => ({
          id: c.id,
          voterName: c.voterName,
          comment: c.comment,
          createdAt: c.createdAt.toISOString(),
          selectedOptionId: c.selectedOptionId || undefined,
          selectedOptionText: c.selectedOptionText || undefined,
          parentId: c.parentId ?? undefined,
        })),
      }));
    }

    await this.refresh();
    // Blob 경로도 공개 투표만 노출(비공개/링크전용 제외).
    return this.data.polls.filter((p) => (p.visibility ?? 'public') === 'public');
  }

  async getPollById(id: string): Promise<Poll | undefined> {
    if (this.useSqlDb) {
      const r = await db.query.polls.findFirst({
        where: eq(schema.polls.id, id),
        with: {
          options: {
            orderBy: (opt, { asc }) => [asc(opt.optionIndex)],
          },
          comments: {
            orderBy: (cmt, { asc }) => [asc(cmt.createdAt)],
          },
        },
      });
      if (!r) return undefined;
      return {
        id: r.id,
        question: r.question,
        description: r.description,
        createdAt: r.createdAt.toISOString(),
        endsAt: r.endsAt ? r.endsAt.toISOString() : null,
        totalVotes: r.totalVotes,
        resultsVisibility: r.resultsVisibility as any,
        visibility: r.visibility as any,
        requiresCode: r.visibility === 'private',
        creatorId: r.creatorId,
        creatorIsGuest: r.creatorIsGuest,
        categoryId: r.categoryId,
        attachments: r.attachments as any,
        options: r.options.map((o) => ({
          id: o.optionIndex,
          text: o.text,
          voteCount: o.voteCount,
          imageUrl: o.imageUrl,
        })),
        comments: r.comments.map((c) => ({
          id: c.id,
          voterName: c.voterName,
          comment: c.comment,
          createdAt: c.createdAt.toISOString(),
          selectedOptionId: c.selectedOptionId || undefined,
          selectedOptionText: c.selectedOptionText || undefined,
          parentId: c.parentId ?? undefined,
        })),
      };
    }

    await this.refresh();
    return this.data.polls.find((p) => p.id === id);
  }

  /** 비공개 투표 접근 코드 검증. accessCode 원문은 외부로 절대 노출하지 않고 내부 비교만 한다. */
  async verifyAccessCode(pollId: string, code: string | null | undefined): Promise<boolean> {
    if (!code) {
      return false;
    }
    if (this.useSqlDb) {
      const r = await db.query.polls.findFirst({
        where: eq(schema.polls.id, pollId),
        columns: { accessCode: true, visibility: true },
      });
      if (!r) return false;
      if (r.visibility !== 'private') return true;
      return r.accessCode === code;
    }
    await this.refresh();
    const p = this.data.polls.find((x) => x.id === pollId) as
      | (Poll & { accessCode?: string | null })
      | undefined;
    if (!p) return false;
    if ((p.visibility ?? 'public') !== 'private') return true;
    return p.accessCode === code;
  }

  async createPoll(poll: Poll & { accessCode?: string | null }) {
    if (this.useSqlDb) {
      await db.insert(schema.polls).values({
        id: poll.id,
        question: poll.question,
        description: poll.description,
        createdAt: new Date(poll.createdAt),
        endsAt: poll.endsAt ? new Date(poll.endsAt) : null,
        totalVotes: poll.totalVotes,
        resultsVisibility: poll.resultsVisibility || 'afterVote',
        visibility: poll.visibility || 'public',
        accessCode: poll.accessCode ?? null,
        creatorId: poll.creatorId,
        creatorIsGuest: poll.creatorIsGuest ?? true,
        categoryId: poll.categoryId ?? null,
        attachments: poll.attachments as any,
      });
      if (poll.options && poll.options.length > 0) {
        await db.insert(schema.pollOptions).values(
          poll.options.map((opt) => ({
            pollId: poll.id,
            optionIndex: opt.id,
            text: opt.text,
            voteCount: opt.voteCount,
            imageUrl: opt.imageUrl,
          })),
        );
      }
      return;
    }

    await this.refresh();
    const next = {
      ...this.data,
      polls: [poll, ...this.data.polls],
    };
    await this.commit(next);
  }

  async updatePoll(poll: Poll) {
    if (this.useSqlDb) {
      await db
        .update(schema.polls)
        .set({
          totalVotes: poll.totalVotes,
        })
        .where(eq(schema.polls.id, poll.id));

      for (const opt of poll.options) {
        await db
          .update(schema.pollOptions)
          .set({
            voteCount: opt.voteCount,
          })
          .where(
            sql`${schema.pollOptions.pollId} = ${poll.id} AND ${schema.pollOptions.optionIndex} = ${opt.id}`,
          );
      }

      const existingComments = await db
        .select({ id: schema.pollComments.id })
        .from(schema.pollComments)
        .where(eq(schema.pollComments.pollId, poll.id));
      const existingIds = new Set(existingComments.map((c) => c.id));

      const newComments = poll.comments.filter((c) => !existingIds.has(c.id));
      if (newComments.length > 0) {
        await db.insert(schema.pollComments).values(
          newComments.map((c) => ({
            pollId: poll.id,
            voterName: c.voterName,
            comment: c.comment,
            createdAt: new Date(c.createdAt),
            selectedOptionId: c.selectedOptionId || null,
            selectedOptionText: c.selectedOptionText || null,
            parentId: c.parentId ?? null,
          })),
        );
      }
      return;
    }

    await this.refresh();
    const nextPolls = [...this.data.polls];
    const idx = nextPolls.findIndex((p) => p.id === poll.id);
    if (idx === -1) {
      return;
    }

    nextPolls[idx] = poll;
    await this.commit({ ...this.data, polls: nextPolls });
  }

  async deletePoll(id: string): Promise<boolean> {
    if (this.useSqlDb) {
      await db.delete(schema.polls).where(eq(schema.polls.id, id));
      return true;
    }

    await this.refresh();
    const exists = this.data.polls.some((p) => p.id === id);
    if (!exists) {
      return false;
    }
    const nextPolls = this.data.polls.filter((p) => p.id !== id);
    await this.commit({ ...this.data, polls: nextPolls });
    return true;
  }

  /**
   * 고민(투표) 본문 수정 저장. 투표수(voteCount)는 건드리지 않고 작성 내용만 갱신한다.
   * optionsStructurallyChanged=true면 선택지를 통째로 교체(추가/삭제/순서변경)한다.
   */
  async savePollContent(
    poll: Poll & { categoryId?: string | null },
    options: { optionsStructurallyChanged: boolean },
  ): Promise<void> {
    if (this.useSqlDb) {
      await db
        .update(schema.polls)
        .set({
          question: poll.question,
          description: poll.description ?? null,
          endsAt: poll.endsAt ? new Date(poll.endsAt) : null,
          resultsVisibility: poll.resultsVisibility || 'afterVote',
          categoryId: poll.categoryId ?? null,
          totalVotes: poll.totalVotes,
          attachments: (poll.attachments ?? []) as any,
        })
        .where(eq(schema.polls.id, poll.id));

      if (options.optionsStructurallyChanged) {
        await db.delete(schema.pollOptions).where(eq(schema.pollOptions.pollId, poll.id));
        if (poll.options.length > 0) {
          await db.insert(schema.pollOptions).values(
            poll.options.map((opt) => ({
              pollId: poll.id,
              optionIndex: opt.id,
              text: opt.text,
              voteCount: opt.voteCount,
              imageUrl: opt.imageUrl,
            })),
          );
        }
      } else {
        for (const opt of poll.options) {
          await db
            .update(schema.pollOptions)
            .set({ text: opt.text, imageUrl: opt.imageUrl })
            .where(
              sql`${schema.pollOptions.pollId} = ${poll.id} AND ${schema.pollOptions.optionIndex} = ${opt.id}`,
            );
        }
      }
      return;
    }

    await this.refresh();
    const nextPolls = [...this.data.polls];
    const idx = nextPolls.findIndex((p) => p.id === poll.id);
    if (idx === -1) {
      return;
    }
    nextPolls[idx] = poll;
    await this.commit({ ...this.data, polls: nextPolls });
  }

  async deleteComment(pollId: string, commentId: number): Promise<boolean> {
    if (this.useSqlDb) {
      await db
        .delete(schema.pollComments)
        .where(
          sql`${schema.pollComments.pollId} = ${pollId} AND ${schema.pollComments.id} = ${commentId}`,
        );
      return true;
    }

    await this.refresh();
    const nextPolls = this.data.polls.map((p) =>
      p.id === pollId
        ? { ...p, comments: p.comments.filter((comment) => comment.id !== commentId) }
        : p,
    );
    await this.commit({ ...this.data, polls: nextPolls });
    return true;
  }

  async getUsers(): Promise<DatabaseUser[]> {
    if (this.useSqlDb) {
      const rows = await db.select().from(schema.users);
      return rows.map((u) => ({
        id: u.id,
        email: u.email,
        passwordHash: u.passwordHash,
        salt: u.salt,
        nickname: u.nickname,
        createdAt: u.createdAt.toISOString(),
        isGuest: u.isGuest,
      }));
    }

    await this.refresh();
    return [...this.data.users];
  }

  async getUserByEmail(email: string): Promise<DatabaseUser | undefined> {
    if (this.useSqlDb) {
      const target = this.sanitizeEmails(email);
      const rows = await db
        .select()
        .from(schema.users)
        .where(eq(schema.users.email, target))
        .limit(1);
      const u = rows[0];
      if (!u) return undefined;
      return {
        id: u.id,
        email: u.email,
        passwordHash: u.passwordHash,
        salt: u.salt,
        nickname: u.nickname,
        createdAt: u.createdAt.toISOString(),
        isGuest: u.isGuest,
      };
    }

    const target = this.sanitizeEmails(email);
    await this.refresh();
    return this.data.users.find((u) => this.sanitizeEmails(u.email) === target);
  }

  async getUserById(id: string): Promise<DatabaseUser | undefined> {
    if (this.useSqlDb) {
      const rows = await db.select().from(schema.users).where(eq(schema.users.id, id)).limit(1);
      const u = rows[0];
      if (!u) return undefined;
      return {
        id: u.id,
        email: u.email,
        passwordHash: u.passwordHash,
        salt: u.salt,
        nickname: u.nickname,
        createdAt: u.createdAt.toISOString(),
        isGuest: u.isGuest,
      };
    }

    await this.refresh();
    return this.data.users.find((u) => u.id === id);
  }

  async createUser(user: DatabaseUser) {
    if (this.useSqlDb) {
      await db.insert(schema.users).values({
        id: user.id,
        email: this.sanitizeEmails(user.email),
        passwordHash: user.passwordHash,
        salt: user.salt,
        nickname: user.nickname,
        createdAt: new Date(user.createdAt),
        isGuest: user.isGuest,
      });
      return;
    }

    await this.refresh();
    const next = {
      ...this.data,
      users: [...this.data.users, user],
    };
    await this.commit(next);
  }
}
