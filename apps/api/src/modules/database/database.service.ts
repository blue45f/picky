import { Injectable, OnModuleInit, ServiceUnavailableException } from '@nestjs/common';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { Poll, PollComment, PaginatedPolls, PollListSort, PollListStatus } from '@picky/shared';
import { get as getBlob, put as putBlob } from '@vercel/blob';
import { createClient, type VercelKV } from '@vercel/kv';
import { Pool } from 'pg';
import { db, pool } from '../../db/index';
import * as schema from '../../db/schema';
import { eq, and, desc, asc, sql, count, ilike, or, isNull, inArray, type SQL } from 'drizzle-orm';

/** Blob 경로에서 비표시 1인1표 메타를 폴 객체에 덧붙이기 위한 내부 확장 타입. */
type PollWithVotedKeys = Poll & { votedKeys?: string[] };

/**
 * 댓글 작성자 식별값(authorId/authorKey)을 내부에서만 들고 다니기 위한 확장 타입.
 * 이 값들은 비밀(voterKey 동급)이라 응답에는 절대 싣지 않는다 — stripCommentAuthors로 제거.
 * 서버의 본인 수정/삭제 권한 판정(getPollWithCommentAuthors)에서만 쓴다.
 */
export type PollCommentWithAuthor = PollComment & {
  authorId?: string | null;
  authorKey?: string | null;
  // 게스트 댓글 관리 비번 해시(salt:hash). 비밀 — 권한 판정 전용, 응답엔 절대 싣지 않는다.
  passwordHash?: string | null;
};
export type PollWithCommentAuthors = Omit<Poll, 'comments'> & {
  comments: PollCommentWithAuthor[];
};

/**
 * 목록 질의 옵션(서버 1-base page + limit + 검색/정렬/필터).
 * 검색·정렬·필터를 서버측 WHERE/ORDER BY로 처리해 현재 페이지에만 적용되던 누락을 없앤다(#W2).
 */
export interface GetPollsOptions {
  page: number;
  limit: number;
  q?: string;
  sort?: PollListSort;
  status?: PollListStatus;
  category?: string | null;
}

/** castVote 결과 — recorded=false 면 (pollId,voterKey) 중복이라 카운트 미증가(409). */
export interface CastVoteResult {
  recorded: boolean;
}

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
            email TEXT NOT NULL,
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
            parent_id INTEGER,
            author_id TEXT,
            author_key TEXT,
            edited_at TIMESTAMP,
            password_hash TEXT
          );
        `);
        // 서버측 1인1표(#12). (poll_id, voter_key) 유니크로 재투표를 막는다. 비파괴·멱등.
        await pool.query(`
          CREATE TABLE IF NOT EXISTS poll_votes (
            id SERIAL PRIMARY KEY,
            poll_id TEXT NOT NULL REFERENCES polls(id) ON DELETE CASCADE,
            voter_key TEXT NOT NULL,
            option_index INTEGER NOT NULL,
            created_at TIMESTAMP DEFAULT NOW() NOT NULL
          );
        `);
        await pool.query(`
          CREATE UNIQUE INDEX IF NOT EXISTS poll_votes_poll_voter_unique_idx
          ON poll_votes (poll_id, voter_key);
        `);
        // 기존 라이브 테이블에 신규 컬럼을 비파괴·멱등으로 추가한다.
        // CREATE TABLE IF NOT EXISTS는 이미 존재하는 테이블엔 컬럼을 더하지 않으므로 ALTER가 필요하다.
        await pool.query(`
          ALTER TABLE polls ADD COLUMN IF NOT EXISTS category_id TEXT;
          ALTER TABLE polls ADD COLUMN IF NOT EXISTS visibility TEXT DEFAULT 'public' NOT NULL;
          ALTER TABLE polls ADD COLUMN IF NOT EXISTS access_code TEXT;
          ALTER TABLE poll_comments ADD COLUMN IF NOT EXISTS parent_id INTEGER;
          ALTER TABLE poll_comments ADD COLUMN IF NOT EXISTS author_id TEXT;
          ALTER TABLE poll_comments ADD COLUMN IF NOT EXISTS author_key TEXT;
          ALTER TABLE poll_comments ADD COLUMN IF NOT EXISTS edited_at TIMESTAMP;
          ALTER TABLE poll_comments ADD COLUMN IF NOT EXISTS password_hash TEXT;
        `);
        // users.email UNIQUE 제약 마이그레이션:
        // 익명/게스트/토스 로그인은 email='' 로 사용자를 만들기 때문에, 기존 `email TEXT NOT NULL UNIQUE`는
        // 두 번째 익명 사용자부터 UNIQUE 충돌(500)을 일으킨다(토스앱 1차 로그인 경로가 이것).
        // 기존 email UNIQUE 제약을 제거하고, 빈 문자열을 제외한 부분 유니크 인덱스로 교체한다.
        // (실제 이메일만 유일성 보장, 익명 사용자의 다중 '' 는 허용. 멱등 — 매 부팅 안전하게 재실행.)
        await pool.query(`
          DO $$
          DECLARE c text;
          BEGIN
            FOR c IN
              SELECT conname FROM pg_constraint
              WHERE conrelid = 'users'::regclass AND contype = 'u'
            LOOP
              EXECUTE 'ALTER TABLE users DROP CONSTRAINT ' || quote_ident(c);
            END LOOP;
          END $$;
        `);
        await pool.query(`
          CREATE UNIQUE INDEX IF NOT EXISTS users_email_unique_idx
          ON users (email) WHERE email <> '';
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

  /**
   * Blob 경로 응답에서 비표시 메타(votedKeys 등)를 제거해 외부로 새지 않게 한다.
   * 댓글의 작성자 식별값(authorId/authorKey)도 비밀이라 함께 제거한다(stripCommentAuthors).
   */
  private stripPollMeta(poll: Poll | undefined): Poll | undefined {
    if (!poll) {
      return poll;
    }
    const next: PollWithVotedKeys = { ...(poll as PollWithVotedKeys) };
    delete next.votedKeys;
    next.comments = this.stripCommentAuthors(next.comments);
    return next;
  }

  /**
   * 댓글 배열에서 비밀 작성자 식별값(authorId/authorKey)·비번 해시(passwordHash)를 제거해 응답 노출을 막는다.
   * 비번 해시는 절대 노출하지 않고, 존재 여부만 hasPassword 불리언으로 파생해 프론트의 자물쇠 어포던스에 쓴다.
   */
  private stripCommentAuthors(comments: PollComment[]): PollComment[] {
    return comments.map((comment) => {
      const next = { ...(comment as PollCommentWithAuthor) };
      const hasPassword = Boolean(next.passwordHash);
      delete next.authorId;
      delete next.authorKey;
      delete next.passwordHash;
      return { ...next, hasPassword } as PollComment;
    });
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

  /**
   * 공개(public) 투표 목록을 서버측 페이지네이션 + 검색/정렬/필터로 반환한다(#10·#W2).
   * 검색(q)·정렬(sort)·상태(status)·카테고리(category)를 WHERE/ORDER BY로 처리한 뒤
   * 페이지네이션해 "현재 페이지만 필터"되던 스케일 누락을 없앤다. SQL·Blob 양 경로 동일 의미.
   */
  async getPolls(options: GetPollsOptions): Promise<PaginatedPolls> {
    const page = Math.max(1, Math.floor(options.page) || 1);
    const limit = Math.max(1, Math.floor(options.limit) || 1);
    const offset = (page - 1) * limit;
    const q = (options.q ?? '').trim();
    const sort: PollListSort = options.sort ?? 'latest';
    const status: PollListStatus = options.status ?? 'all';
    const category = (options.category ?? '').trim() || null;
    const nowIso = new Date().toISOString();

    if (this.useSqlDb) {
      // 홈 목록은 공개(public) 투표만 — unlisted/private는 링크/코드로만 접근한다.
      const conditions: SQL[] = [eq(schema.polls.visibility, 'public')];
      if (q) {
        const like = `%${q.replaceAll('%', '\\%').replaceAll('_', '\\_')}%`;
        const search = or(
          ilike(schema.polls.question, like),
          ilike(schema.polls.description, like),
        );
        if (search) conditions.push(search);
      }
      if (category) {
        conditions.push(eq(schema.polls.categoryId, category));
      }
      if (status === 'open') {
        // 마감 없음(NULL) 또는 마감 시각이 미래.
        const open = or(isNull(schema.polls.endsAt), sql`${schema.polls.endsAt} > NOW()`);
        if (open) conditions.push(open);
      } else if (status === 'closed') {
        conditions.push(
          sql`${schema.polls.endsAt} IS NOT NULL AND ${schema.polls.endsAt} <= NOW()`,
        );
      }
      const where = and(...conditions);

      const countRows = await db.select({ value: count() }).from(schema.polls).where(where);
      const total = countRows[0]?.value ?? 0;

      // '댓글 많은순'(commented)은 상관 서브쿼리를 RQB(findMany)의 orderBy에 넘기면 무효 SQL이 돼 500이 난다.
      // (RQB가 베이스 테이블을 서브쿼리로 감싸므로 polls.id 참조가 ORDER BY 스코프 밖으로 나간다.)
      // → 코어 select + leftJoin + groupBy 로 정렬·페이지네이션된 poll id 만 먼저 뽑고,
      //   그 id들로 RQB 본문(options/comments 포함)을 로드해 같은 순서로 재정렬한다.
      if (sort === 'commented') {
        const orderedIdRows = await db
          .select({ id: schema.polls.id })
          .from(schema.polls)
          .leftJoin(schema.pollComments, eq(schema.pollComments.pollId, schema.polls.id))
          .where(where)
          .groupBy(schema.polls.id)
          .orderBy(desc(count(schema.pollComments.id)), desc(schema.polls.createdAt))
          .limit(limit)
          .offset(offset);
        const orderedIds = orderedIdRows.map((r) => r.id);
        if (orderedIds.length === 0) {
          return { items: [], total, page, limit, hasMore: false };
        }
        const detailedRows = await db.query.polls.findMany({
          where: inArray(schema.polls.id, orderedIds),
          with: {
            options: {
              orderBy: (opt, { asc: ascFn }) => [ascFn(opt.optionIndex)],
            },
            comments: {
              orderBy: (cmt, { asc: ascFn }) => [ascFn(cmt.createdAt)],
            },
          },
        });
        const byId = new Map(detailedRows.map((r) => [r.id, this.mapPollRow(r)]));
        const items: Poll[] = orderedIds
          .map((id) => byId.get(id))
          .filter((poll): poll is Poll => Boolean(poll));
        return { items, total, page, limit, hasMore: offset + items.length < total };
      }

      const rows = await db.query.polls.findMany({
        where,
        orderBy: this.buildPollOrderBy(sort),
        limit,
        offset,
        with: {
          options: {
            orderBy: (opt, { asc: ascFn }) => [ascFn(opt.optionIndex)],
          },
          comments: {
            orderBy: (cmt, { asc: ascFn }) => [ascFn(cmt.createdAt)],
          },
        },
      });
      const items: Poll[] = rows.map((r) => this.mapPollRow(r));
      return { items, total, page, limit, hasMore: offset + items.length < total };
    }

    await this.refresh();
    // Blob 경로도 SQL과 같은 의미로 공개+검색+상태+카테고리 필터 후 정렬·slice 한다.
    const needle = q.toLowerCase();
    const filtered = this.data.polls.filter((p) => {
      if ((p.visibility ?? 'public') !== 'public') return false;
      if (category && (p.categoryId ?? null) !== category) return false;
      if (needle) {
        const inQuestion = p.question.toLowerCase().includes(needle);
        const inDescription = (p.description ?? '').toLowerCase().includes(needle);
        if (!inQuestion && !inDescription) return false;
      }
      if (status !== 'all') {
        const closed = Boolean(p.endsAt) && p.endsAt! <= nowIso;
        if (status === 'open' && closed) return false;
        if (status === 'closed' && !closed) return false;
      }
      return true;
    });
    const sorted = this.sortPollsInMemory(filtered, sort, nowIso);
    const total = sorted.length;
    const items = sorted.slice(offset, offset + limit).map((p) => this.stripPollMeta(p) as Poll);
    return { items, total, page, limit, hasMore: offset + items.length < total };
  }

  /**
   * SQL ORDER BY 절을 정렬 키로 매핑한다.
   * 'commented'(댓글 많은순)는 상관 서브쿼리가 RQB orderBy에서 무효 SQL이 되므로 여기서 다루지 않고,
   * getPolls가 코어 select(leftJoin+groupBy) 전용 경로로 별도 처리한다.
   */
  private buildPollOrderBy(sort: PollListSort): SQL[] {
    switch (sort) {
      case 'popular':
        return [desc(schema.polls.totalVotes), desc(schema.polls.createdAt)];
      case 'closing': {
        // 열린 것(마감 미래/없음) 우선, 그 안에서 마감 가까운 순. 마감된 건 뒤로 최신순.
        const closingRank = sql`CASE WHEN ${schema.polls.endsAt} IS NOT NULL AND ${schema.polls.endsAt} > NOW() THEN 0 ELSE 1 END`;
        return [asc(closingRank), asc(schema.polls.endsAt), desc(schema.polls.createdAt)];
      }
      default:
        return [desc(schema.polls.createdAt)];
    }
  }

  /** Blob/in-memory 정렬 — SQL ORDER BY와 같은 의미. 원본을 변형하지 않게 복사 후 정렬. */
  private sortPollsInMemory(polls: Poll[], sort: PollListSort, nowIso: string): Poll[] {
    const byCreatedDesc = (a: Poll, b: Poll) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    const next = [...polls];
    switch (sort) {
      case 'popular':
        return next.sort((a, b) => b.totalVotes - a.totalVotes || byCreatedDesc(a, b));
      case 'commented':
        return next.sort((a, b) => b.comments.length - a.comments.length || byCreatedDesc(a, b));
      case 'closing':
        return next.sort((a, b) => {
          const aOpen = Boolean(a.endsAt) && a.endsAt! > nowIso;
          const bOpen = Boolean(b.endsAt) && b.endsAt! > nowIso;
          const aHasEnd = Boolean(a.endsAt);
          const bHasEnd = Boolean(b.endsAt);
          // 열림(마감 미래) 우선, 다음 마감없음(진행중), 마지막 마감됨.
          const rank = (open: boolean, hasEnd: boolean) => (open ? 0 : hasEnd ? 2 : 1);
          const ra = rank(aOpen, aHasEnd);
          const rb = rank(bOpen, bHasEnd);
          if (ra !== rb) return ra - rb;
          if (aOpen && bOpen) {
            return new Date(a.endsAt!).getTime() - new Date(b.endsAt!).getTime();
          }
          return byCreatedDesc(a, b);
        });
      default:
        return next.sort(byCreatedDesc);
    }
  }

  /**
   * Drizzle polls 행(options/comments 포함)을 공유 Poll 응답 형태로 변환한다.
   * includeAuthors=true 면 댓글에 authorId/authorKey(비밀)를 내부용으로 포함한다(권한 판정 전용).
   * 기본은 false — 응답 경로는 절대 작성자 식별값을 노출하지 않는다.
   */
  private mapPollRow(
    r: {
      id: string;
      question: string;
      description: string | null;
      createdAt: Date;
      endsAt: Date | null;
      totalVotes: number;
      resultsVisibility: string;
      visibility: string;
      creatorId: string | null;
      creatorIsGuest: boolean;
      categoryId: string | null;
      attachments: unknown;
      options: Array<{
        optionIndex: number;
        text: string;
        voteCount: number;
        imageUrl: string | null;
      }>;
      comments: Array<{
        id: number;
        voterName: string;
        comment: string;
        createdAt: Date;
        selectedOptionId: number | null;
        selectedOptionText: string | null;
        parentId: number | null;
        authorId?: string | null;
        authorKey?: string | null;
        editedAt?: Date | null;
        passwordHash?: string | null;
      }>;
    },
    includeAuthors = false,
  ): Poll {
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
        editedAt: c.editedAt ? c.editedAt.toISOString() : undefined,
        // 비번 존재 여부(hasPassword)는 공개 표시값 — 항상 싣는다(해시·원문은 절대 노출 안 함).
        hasPassword: Boolean(c.passwordHash),
        // authorId/authorKey/passwordHash 는 비밀 — includeAuthors(내부 권한 판정)일 때만 싣는다.
        ...(includeAuthors
          ? {
              authorId: c.authorId ?? null,
              authorKey: c.authorKey ?? null,
              passwordHash: c.passwordHash ?? null,
            }
          : {}),
      })),
    } as Poll;
  }

  async getPollById(id: string): Promise<Poll | undefined> {
    if (this.useSqlDb) {
      const r = await db.query.polls.findFirst({
        where: eq(schema.polls.id, id),
        with: {
          options: {
            orderBy: (opt, { asc: ascFn }) => [ascFn(opt.optionIndex)],
          },
          comments: {
            orderBy: (cmt, { asc: ascFn }) => [ascFn(cmt.createdAt)],
          },
        },
      });
      if (!r) return undefined;
      const poll = this.mapPollRow(r);
      // 단건 상세에만 작성자 닉네임을 해석해 채운다(목록엔 비움). creatorId 없으면/유저 없으면 null.
      poll.creatorNickname = await this.resolveCreatorNickname(r.creatorId);
      return poll;
    }

    await this.refresh();
    const found = this.stripPollMeta(this.data.polls.find((p) => p.id === id));
    if (!found) return found;
    return { ...found, creatorNickname: this.resolveCreatorNicknameFromMemory(found.creatorId) };
  }

  /**
   * 내부 전용 — 댓글 작성자 식별값(authorId/authorKey)을 포함해 폴을 읽는다(본인 권한 판정용).
   * 이 결과는 응답에 그대로 내보내면 안 된다(비밀 노출). 서버 권한 검사 후 버린다.
   */
  async getPollWithCommentAuthors(id: string): Promise<PollWithCommentAuthors | undefined> {
    if (this.useSqlDb) {
      const r = await db.query.polls.findFirst({
        where: eq(schema.polls.id, id),
        with: {
          options: {
            orderBy: (opt, { asc: ascFn }) => [ascFn(opt.optionIndex)],
          },
          comments: {
            orderBy: (cmt, { asc: ascFn }) => [ascFn(cmt.createdAt)],
          },
        },
      });
      if (!r) return undefined;
      // includeAuthors=true 로 댓글에 authorId/authorKey 를 실어 권한 판정에 쓴다.
      return this.mapPollRow(r, true) as PollWithCommentAuthors;
    }

    await this.refresh();
    // in-memory 는 votedKeys 만 떼고 댓글 author 필드는 보존한 사본을 돌려준다(권한 판정용).
    const raw = this.data.polls.find((p) => p.id === id);
    if (!raw) return undefined;
    const next = { ...(raw as PollWithVotedKeys) };
    delete next.votedKeys;
    return next as PollWithCommentAuthors;
  }

  /** creatorId → users.nickname 해석(SQL). 없거나 유저를 못 찾으면 null. */
  private async resolveCreatorNickname(creatorId: string | null): Promise<string | null> {
    const trimmed = (creatorId ?? '').trim();
    if (!trimmed) return null;
    const rows = await db
      .select({ nickname: schema.users.nickname })
      .from(schema.users)
      .where(eq(schema.users.id, trimmed))
      .limit(1);
    const nickname = rows[0]?.nickname?.trim();
    return nickname ? nickname : null;
  }

  /** creatorId → 메모리(Blob) 사용자 닉네임 해석. 없거나 못 찾으면 null. */
  private resolveCreatorNicknameFromMemory(creatorId: string | null | undefined): string | null {
    const trimmed = (creatorId ?? '').trim();
    if (!trimmed) return null;
    const user = this.data.users.find((u) => u.id === trimmed);
    const nickname = user?.nickname?.trim();
    return nickname ? nickname : null;
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
    options: {
      optionsStructurallyChanged: boolean;
      // accessCode 변경 의미: undefined=변경 안 함(기존 유지), string=교체, null=제거(공개 전환).
      accessCode?: string | null;
    },
  ): Promise<void> {
    if (this.useSqlDb) {
      await db
        .update(schema.polls)
        .set({
          question: poll.question,
          description: poll.description ?? null,
          endsAt: poll.endsAt ? new Date(poll.endsAt) : null,
          resultsVisibility: poll.resultsVisibility || 'afterVote',
          visibility: poll.visibility || 'public',
          categoryId: poll.categoryId ?? null,
          totalVotes: poll.totalVotes,
          attachments: (poll.attachments ?? []) as any,
          // 코드 변경이 지정된 경우에만 컬럼을 건드린다(미지정이면 기존 코드 보존).
          ...(options.accessCode !== undefined ? { accessCode: options.accessCode } : {}),
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
    const existing = nextPolls[idx] as Poll & { accessCode?: string | null };
    // poll 객체엔 accessCode 가 없으므로 in-memory 경로에선 기존 코드를 보존하되,
    // options.accessCode 가 명시되면(교체/제거) 그 값으로 덮어쓴다.
    nextPolls[idx] = {
      ...poll,
      accessCode:
        options.accessCode !== undefined ? options.accessCode : (existing?.accessCode ?? null),
    } as Poll;
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

  /**
   * 서버측 1인1표(#12) + 원자적 카운트 증가(#B1).
   *
   * 프로덕션 SQL 경로는 dedup row 기록과 vote_count/total_votes 증가를 **하나의 트랜잭션**으로 묶고
   * 카운트를 **상대 증가**(`+ 1`)로 처리해 — ①카운트 증가 실패 시 키만 남아 표가 유실되고 영구 409로
   * 잠기는 문제와 ②동시 투표 시 read-modify-write 클로버로 집계가 누락되는 문제를 함께 막는다(원자적·동시성 안전).
   * Blob/in-memory 경로는 dev 폴백이라 뮤텍스가 없어 best-effort dedup이다(단일 프로세스 가정).
   *
   * - voterKey가 있으면 dedup INSERT가 성공(=첫 투표)했을 때만 카운트를 올린다. 충돌이면 recorded=false(409).
   * - voterKey가 비어 있으면(레거시·키 미지원) dedup 없이 카운트만 올린다(recorded=true).
   * - 댓글 추가/재조회는 호출부(PollService)가 별도로 처리한다.
   *
   * @returns recorded=true 면 표가 반영됨, false 면 중복이라 미반영(409로 막아야 함).
   */
  async castVote(
    pollId: string,
    voterKey: string | null | undefined,
    optionIndex: number,
  ): Promise<CastVoteResult> {
    const key = (voterKey ?? '').trim();

    if (this.useSqlDb) {
      return db.transaction(async (tx) => {
        if (key) {
          // dedup row 를 먼저 기록 — 유니크 충돌이면 행이 안 들어가고(=중복) 카운트도 올리지 않는다.
          const inserted = await tx
            .insert(schema.pollVotes)
            .values({ pollId, voterKey: key, optionIndex })
            .onConflictDoNothing({
              target: [schema.pollVotes.pollId, schema.pollVotes.voterKey],
            })
            .returning({ id: schema.pollVotes.id });
          if (inserted.length === 0) {
            return { recorded: false };
          }
        }
        // 상대 증가(절대값 쓰기 금지) — 같은 트랜잭션에서 옵션·폴 카운트를 함께 올린다.
        await tx
          .update(schema.pollOptions)
          .set({ voteCount: sql`${schema.pollOptions.voteCount} + 1` })
          .where(
            and(
              eq(schema.pollOptions.pollId, pollId),
              eq(schema.pollOptions.optionIndex, optionIndex),
            ),
          );
        await tx
          .update(schema.polls)
          .set({ totalVotes: sql`${schema.polls.totalVotes} + 1` })
          .where(eq(schema.polls.id, pollId));
        return { recorded: true };
      });
    }

    // Blob/in-memory 경로(dev 폴백) — 키 기록과 카운트 증가를 한 commit으로 묶지만 뮤텍스가 없어 best-effort(단일 프로세스 가정).
    await this.refresh();
    const nextPolls = [...this.data.polls];
    const idx = nextPolls.findIndex((p) => p.id === pollId);
    if (idx === -1) {
      // 폴이 없으면 호출부(vote)가 별도로 404를 던진다. 여기선 미반영으로 둔다.
      return { recorded: false };
    }
    const target = nextPolls[idx] as PollWithVotedKeys;
    if (key) {
      const votedKeys = Array.isArray(target.votedKeys) ? target.votedKeys : [];
      if (votedKeys.includes(key)) {
        return { recorded: false };
      }
    }
    const option = target.options.find((o) => o.id === optionIndex);
    if (!option) {
      // 호출부가 옵션 검증을 먼저 하지만 방어적으로 미반영.
      return { recorded: false };
    }
    const nextOptions = target.options.map((o) =>
      o.id === optionIndex ? { ...o, voteCount: o.voteCount + 1 } : o,
    );
    const nextVotedKeys = key
      ? [...(Array.isArray(target.votedKeys) ? target.votedKeys : []), key]
      : target.votedKeys;
    nextPolls[idx] = {
      ...target,
      options: nextOptions,
      totalVotes: target.totalVotes + 1,
      ...(nextVotedKeys ? { votedKeys: nextVotedKeys } : {}),
    } as PollWithVotedKeys;
    await this.commit({ ...this.data, polls: nextPolls });
    return { recorded: true };
  }

  /**
   * 폴에 새 댓글(의견/답글)만 추가한다. 카운트는 castVote가 이미 원자적으로 올렸으므로 건드리지 않는다.
   * SQL은 단일 INSERT, Blob은 commit. 새 댓글의 DB serial id 정합은 호출부 재조회로 맞춘다.
   */
  async appendComment(
    pollId: string,
    comment: {
      voterName: string;
      comment: string;
      createdAt: string;
      selectedOptionId?: number | null;
      selectedOptionText?: string | null;
      parentId?: number | null;
      // 작성자 식별값(비밀) — 본인 수정/삭제 권한 판정용. 회원=authorId, 비회원=authorKey.
      authorId?: string | null;
      authorKey?: string | null;
      // 게스트 댓글 관리 비번 해시(비밀, salt:hash). 미설정이면 null. 다른 기기서 본인 인정용.
      passwordHash?: string | null;
    },
  ): Promise<void> {
    if (this.useSqlDb) {
      await db.insert(schema.pollComments).values({
        pollId,
        voterName: comment.voterName,
        comment: comment.comment,
        createdAt: new Date(comment.createdAt),
        selectedOptionId: comment.selectedOptionId ?? null,
        selectedOptionText: comment.selectedOptionText ?? null,
        parentId: comment.parentId ?? null,
        authorId: comment.authorId ?? null,
        authorKey: comment.authorKey ?? null,
        passwordHash: comment.passwordHash ?? null,
      });
      return;
    }

    await this.refresh();
    const nextPolls = [...this.data.polls];
    const idx = nextPolls.findIndex((p) => p.id === pollId);
    if (idx === -1) {
      return;
    }
    const target = nextPolls[idx] as PollWithVotedKeys;
    const nextId = target.comments.reduce((max, c) => Math.max(max, c.id), 0) + 1;
    const nextComment: PollCommentWithAuthor = {
      id: nextId,
      voterName: comment.voterName,
      comment: comment.comment,
      createdAt: comment.createdAt,
      selectedOptionId: comment.selectedOptionId ?? undefined,
      selectedOptionText: comment.selectedOptionText ?? undefined,
      parentId: comment.parentId ?? null,
      authorId: comment.authorId ?? null,
      authorKey: comment.authorKey ?? null,
      passwordHash: comment.passwordHash ?? null,
    };
    nextPolls[idx] = {
      ...target,
      comments: [...target.comments, nextComment],
    } as PollWithVotedKeys;
    await this.commit({ ...this.data, polls: nextPolls });
  }

  /** 댓글 텍스트 수정 — 작성자/원시각은 불변, comment 와 edited_at 만 갱신한다(권한 검사는 서비스). */
  async updateComment(pollId: string, commentId: number, comment: string): Promise<boolean> {
    const editedAt = new Date();
    if (this.useSqlDb) {
      await db
        .update(schema.pollComments)
        .set({ comment, editedAt })
        .where(
          sql`${schema.pollComments.pollId} = ${pollId} AND ${schema.pollComments.id} = ${commentId}`,
        );
      return true;
    }

    await this.refresh();
    const editedAtIso = editedAt.toISOString();
    const nextPolls = this.data.polls.map((p) =>
      p.id === pollId
        ? {
            ...p,
            comments: p.comments.map((c) =>
              c.id === commentId ? { ...c, comment, editedAt: editedAtIso } : c,
            ),
          }
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

  /** 회원 탈퇴 — 사용자의 고민을 익명화(creator 해제)해 토론은 보존하고 계정을 삭제한다. */
  async deleteUser(userId: string) {
    if (this.useSqlDb) {
      await db
        .update(schema.polls)
        .set({ creatorId: null, creatorIsGuest: true })
        .where(eq(schema.polls.creatorId, userId));
      await db.delete(schema.users).where(eq(schema.users.id, userId));
      return;
    }

    await this.refresh();
    const next = {
      ...this.data,
      polls: this.data.polls.map((p) =>
        p.creatorId === userId ? { ...p, creatorId: null, creatorIsGuest: true } : p,
      ),
      users: this.data.users.filter((u) => u.id !== userId),
    };
    await this.commit(next);
  }
}
