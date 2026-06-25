import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import type { Poll, PollOption } from '@picky/shared';
import { DatabaseService } from './database.service';

// 이 스위트는 SQL이 아닌 in-memory(파일) 경로를 검증한다.
// DatabaseService 인스턴스는 생성(new) 시점에 env(DATABASE_URL/PICKY_DB_PATH 등)를 읽으므로,
// 첫 인스턴스를 만들기 전(=테스트 실행 전) 이 시점에서 env를 정리해 둔다.
delete process.env.DATABASE_URL;
delete process.env.KV_REST_API_URL;
delete process.env.KV_REST_API_TOKEN;
delete process.env.BLOB_READ_WRITE_TOKEN;
process.env.PICKY_ALLOW_EPHEMERAL_STORAGE = 'true';

interface DatabaseUserSeed {
  id: string;
  email: string;
  passwordHash: string;
  salt: string;
  nickname: string;
  createdAt: string;
  isGuest: boolean;
}
type ServiceState = { polls: Poll[]; users: DatabaseUserSeed[] };
const findOption = (poll: Poll | undefined, id: number): PollOption | undefined =>
  poll?.options.find((o) => o.id === id);

const seedPoll = (overrides: Partial<Poll> = {}): Poll => ({
  id: 'p1',
  question: '저녁 메뉴?',
  description: null,
  options: [
    { id: 1, text: '치킨', voteCount: 0 },
    { id: 2, text: '피자', voteCount: 0 },
  ],
  comments: [],
  attachments: [],
  createdAt: new Date().toISOString(),
  endsAt: null,
  totalVotes: 0,
  resultsVisibility: 'afterVote',
  visibility: 'public',
  creatorId: null,
  creatorIsGuest: true,
  categoryId: null,
  ...overrides,
});

describe('DatabaseService in-memory vote path (#B1 atomic relative increment)', () => {
  let tmpFile: string;

  const newService = (state: ServiceState) => {
    fs.writeFileSync(tmpFile, JSON.stringify(state), 'utf-8');
    process.env.PICKY_DB_PATH = tmpFile;
    return new DatabaseService();
  };

  beforeEach(() => {
    tmpFile = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'picky-db-')), 'db.json');
  });

  afterEach(() => {
    try {
      fs.rmSync(path.dirname(tmpFile), { recursive: true, force: true });
    } catch {
      // ignore
    }
    delete process.env.PICKY_DB_PATH;
  });

  it('increments the chosen option and totalVotes by exactly one (relative, not absolute)', async () => {
    const service = await newService({
      polls: [
        seedPoll({
          totalVotes: 5,
          options: [
            { id: 1, text: '치킨', voteCount: 3 },
            { id: 2, text: '피자', voteCount: 2 },
          ],
        }),
      ],
      users: [],
    });

    const result = await service.castVote('p1', 'voter-a', 1);
    expect(result.recorded).toBe(true);

    const poll = await service.getPollById('p1');
    expect(poll?.totalVotes).toBe(6);
    expect(findOption(poll, 1)?.voteCount).toBe(4);
    expect(findOption(poll, 2)?.voteCount).toBe(2);
  });

  it('blocks a duplicate (pollId, voterKey) without increasing counts (409 path)', async () => {
    const service = await newService({ polls: [seedPoll()], users: [] });

    const first = await service.castVote('p1', 'same-key', 1);
    const second = await service.castVote('p1', 'same-key', 2);

    expect(first.recorded).toBe(true);
    expect(second.recorded).toBe(false);

    const poll = await service.getPollById('p1');
    // 첫 표만 반영(중복은 카운트 증가 없음).
    expect(poll?.totalVotes).toBe(1);
    expect(findOption(poll, 1)?.voteCount).toBe(1);
    expect(findOption(poll, 2)?.voteCount).toBe(0);
  });

  it('allows the legacy path (no voterKey) and still increments counts', async () => {
    const service = await newService({ polls: [seedPoll()], users: [] });

    const a = await service.castVote('p1', null, 1);
    const b = await service.castVote('p1', '', 1);
    expect(a.recorded).toBe(true);
    expect(b.recorded).toBe(true);

    const poll = await service.getPollById('p1');
    expect(poll?.totalVotes).toBe(2);
    expect(findOption(poll, 1)?.voteCount).toBe(2);
  });

  it('does not record when the poll is missing', async () => {
    const service = await newService({ polls: [seedPoll()], users: [] });
    const result = await service.castVote('missing', 'k', 1);
    expect(result.recorded).toBe(false);
  });
});

describe('DatabaseService getPolls sort=commented (댓글 많은순 — no crash, correct order)', () => {
  let tmpFile: string;

  const newService = (state: ServiceState) => {
    fs.writeFileSync(tmpFile, JSON.stringify(state), 'utf-8');
    process.env.PICKY_DB_PATH = tmpFile;
    return new DatabaseService();
  };

  beforeEach(() => {
    tmpFile = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'picky-db-')), 'db.json');
  });

  afterEach(() => {
    try {
      fs.rmSync(path.dirname(tmpFile), { recursive: true, force: true });
    } catch {
      // ignore
    }
    delete process.env.PICKY_DB_PATH;
  });

  const withComments = (id: string, n: number, createdAt: string): Poll =>
    seedPoll({
      id,
      createdAt,
      comments: Array.from({ length: n }, (_, i) => ({
        id: i + 1,
        voterName: '익명',
        comment: `c${i}`,
        createdAt,
      })),
    });

  it('orders public polls by comment count desc and paginates without throwing', async () => {
    const service = await newService({
      polls: [
        withComments('p-low', 1, '2026-01-01T00:00:00.000Z'),
        withComments('p-high', 5, '2026-01-02T00:00:00.000Z'),
        withComments('p-mid', 3, '2026-01-03T00:00:00.000Z'),
      ],
      users: [],
    });

    const result = await service.getPolls({ page: 1, limit: 20, sort: 'commented', status: 'all' });

    expect(result.items.map((p) => p.id)).toEqual(['p-high', 'p-mid', 'p-low']);
    expect(result.total).toBe(3);
    expect(result.hasMore).toBe(false);
  });

  it('breaks comment-count ties by newest createdAt', async () => {
    const service = await newService({
      polls: [
        withComments('older', 2, '2026-01-01T00:00:00.000Z'),
        withComments('newer', 2, '2026-02-01T00:00:00.000Z'),
      ],
      users: [],
    });

    const result = await service.getPolls({ page: 1, limit: 20, sort: 'commented', status: 'all' });
    expect(result.items.map((p) => p.id)).toEqual(['newer', 'older']);
  });
});

describe('DatabaseService creatorNickname resolution (#B4)', () => {
  let tmpFile: string;

  const newService = (state: ServiceState) => {
    fs.writeFileSync(tmpFile, JSON.stringify(state), 'utf-8');
    process.env.PICKY_DB_PATH = tmpFile;
    return new DatabaseService();
  };

  beforeEach(() => {
    tmpFile = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'picky-db-')), 'db.json');
  });

  afterEach(() => {
    try {
      fs.rmSync(path.dirname(tmpFile), { recursive: true, force: true });
    } catch {
      // ignore
    }
    delete process.env.PICKY_DB_PATH;
  });

  it('resolves creatorId to the user nickname on a single poll', async () => {
    const service = await newService({
      polls: [seedPoll({ creatorId: 'u-1', creatorIsGuest: false })],
      users: [
        {
          id: 'u-1',
          email: 'a@b.com',
          passwordHash: 'x',
          salt: 'y',
          nickname: '희준',
          createdAt: new Date().toISOString(),
          isGuest: false,
        },
      ],
    });

    const poll = await service.getPollById('p1');
    expect(poll?.creatorNickname).toBe('희준');
  });

  it('returns null nickname when the creator is anonymous or unknown', async () => {
    const service = await newService({
      polls: [seedPoll({ id: 'p1', creatorId: null }), seedPoll({ id: 'p2', creatorId: 'ghost' })],
      users: [],
    });

    const anon = await service.getPollById('p1');
    const unknown = await service.getPollById('p2');
    expect(anon?.creatorNickname).toBeNull();
    expect(unknown?.creatorNickname).toBeNull();
  });
});
