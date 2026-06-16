import { Injectable, OnModuleInit } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { Poll } from '@picky/shared';
import { createClient, type VercelKV } from '@vercel/kv';

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
  private readonly filePath = path.resolve(
    process.env.PICKY_DB_PATH?.trim() ||
      (process.env.NODE_ENV === 'production'
        ? '/tmp/picky-db.json'
        : path.resolve(process.cwd(), 'db.json')),
  );
  private readonly storageClient: DatabaseStorageClient | null = this.createStorageClient();
  private data: DatabaseState = { polls: [], users: [] };
  private initialized = false;

  onModuleInit() {
    return this.load();
  }

  private createStorageClient(): DatabaseStorageClient | null {
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

  private createSeedData(): DatabaseState {
    return {
      polls: [
        {
          id: 'seed-onboarding-poll',
          question:
            'WebstormProjects 개인 프로젝트들 중 어떤 것을 가장 먼저 상용 서비스화 시킬까요?',
          description:
            '일상에서 고민되는 것들을 지인들에게 쉽게 물어보는 pickflow(피키) 서비스 출시를 축하하며, 다음 개인 프로젝트 중 하나를 상용 런칭하고 싶습니다. 여러분의 선택은?',
          options: [
            {
              id: 1,
              text: 'PromptMarket (프롬프트/에이전트 마켓)',
              voteCount: 15,
              imageUrl:
                'https://images.unsplash.com/photo-1677442136019-21780efad99a?w=400&q=80',
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
              imageUrl:
                'https://images.unsplash.com/photo-1576765608535-5f04d1e3f289?w=400&q=80',
            },
            {
              id: 4,
              text: 'orbit-ui (유려한 글라스모피즘 컴포넌트 킷)',
              voteCount: 19,
              imageUrl:
                'https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?w=400&q=80',
            },
          ],
          comments: [
            {
              id: 1,
              voterName: '시니어FE',
              comment:
                'PromptMarket이 요즘 AI 트렌드에 가장 정합해서 비즈니스 잠재력이 큽니다!',
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
          .filter((user: any) => user && typeof user.id === 'string' && typeof user.email === 'string')
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
        .filter((poll: any) => poll && typeof poll.id === 'string' && typeof poll.question === 'string')
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
        console.error('Failed to persist with KV, fallback file storage used.', error);
      }
    }

    this.saveToFile(nextState);
  }

  private async load() {
    if (this.initialized) {
      return;
    }

    try {
      const loaded = await this.loadFromKv();
      if (loaded) {
        this.data = loaded;
      } else {
        this.data = this.loadFromFile();
      }
    } catch (error) {
      console.error('Failed to initialize database, fallback file storage.', error);
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
      } catch {
        // use in-memory as fallback
      }
    }
  }

  private async refresh() {
    await this.load();
    await this.sync();
  }

  private async commit(nextState: DatabaseState) {
    this.data = nextState;
    await this.persist(nextState);
  }

  async getPolls(): Promise<Poll[]> {
    await this.refresh();
    return [...this.data.polls];
  }

  async getPollById(id: string): Promise<Poll | undefined> {
    await this.refresh();
    return this.data.polls.find((p) => p.id === id);
  }

  async createPoll(poll: Poll) {
    await this.refresh();
    const next = {
      ...this.data,
      polls: [poll, ...this.data.polls],
    };
    await this.commit(next);
  }

  async updatePoll(poll: Poll) {
    await this.refresh();
    const nextPolls = [...this.data.polls];
    const idx = nextPolls.findIndex((p) => p.id === poll.id);
    if (idx === -1) {
      return;
    }

    nextPolls[idx] = poll;
    await this.commit({ ...this.data, polls: nextPolls });
  }

  async getUsers(): Promise<DatabaseUser[]> {
    await this.refresh();
    return [...this.data.users];
  }

  async getUserByEmail(email: string): Promise<DatabaseUser | undefined> {
    const target = this.sanitizeEmails(email);
    await this.refresh();
    return this.data.users.find((u) => this.sanitizeEmails(u.email) === target);
  }

  async getUserById(id: string): Promise<DatabaseUser | undefined> {
    await this.refresh();
    return this.data.users.find((u) => u.id === id);
  }

  async createUser(user: DatabaseUser) {
    await this.refresh();
    const next = {
      ...this.data,
      users: [...this.data.users, user],
    };
    await this.commit(next);
  }
}
