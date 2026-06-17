"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.DatabaseService = void 0;
const common_1 = require("@nestjs/common");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const kv_1 = require("@vercel/kv");
let DatabaseService = class DatabaseService {
    storageKey = 'picky:database:v1';
    filePath = path.resolve(process.env.PICKY_DB_PATH?.trim() ||
        (process.env.NODE_ENV === 'production'
            ? '/tmp/picky-db.json'
            : path.resolve(process.cwd(), 'db.json')));
    storageClient = this.createStorageClient();
    data = { polls: [], users: [] };
    initialized = false;
    onModuleInit() {
        return this.load();
    }
    createStorageClient() {
        const url = process.env.KV_REST_API_URL?.trim();
        const token = process.env.KV_REST_API_TOKEN?.trim();
        if (!url || !token) {
            return null;
        }
        try {
            return (0, kv_1.createClient)({ url, token });
        }
        catch {
            return null;
        }
    }
    createSeedData() {
        return {
            polls: [
                {
                    id: 'seed-onboarding-poll',
                    question: 'WebstormProjects 개인 프로젝트들 중 어떤 것을 가장 먼저 상용 서비스화 시킬까요?',
                    description: '일상에서 고민되는 것들을 지인들에게 쉽게 물어보는 pickflow(피키) 서비스 출시를 축하하며, 다음 개인 프로젝트 중 하나를 상용 런칭하고 싶습니다. 여러분의 선택은?',
                    options: [
                        {
                            id: 1,
                            text: 'PromptMarket (프롬프트/에이전트 마켓)',
                            voteCount: 15,
                            imageUrl: 'https://images.unsplash.com/photo-1677442136019-21780efad99a?w=400&q=80',
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
                            comment: '역시 Orbit UI 가 유려한 컴포넌트 킷이라 디자이너들에게 인기가 많을 것 같네요.',
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
    sanitizeEmails(value) {
        return (value || '').trim().toLowerCase();
    }
    sanitizeData(candidate) {
        const raw = candidate;
        const polls = Array.isArray(raw?.polls) ? raw?.polls : [];
        const users = Array.isArray(raw?.users)
            ? raw.users
                .filter((user) => user && typeof user.id === 'string' && typeof user.email === 'string')
                .map((user) => ({
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
                .filter((poll) => poll && typeof poll.id === 'string' && typeof poll.question === 'string')
                .map((poll) => ({
                ...poll,
                options: Array.isArray(poll.options) ? poll.options : [],
                comments: Array.isArray(poll.comments) ? poll.comments : [],
                createdAt: String(poll.createdAt || new Date().toISOString()),
                totalVotes: typeof poll.totalVotes === 'number' ? poll.totalVotes : Number(poll.totalVotes) || 0,
            })),
            users: users.map((user) => ({
                ...user,
                email: this.sanitizeEmails(user.email),
            })),
        };
    }
    async loadFromKv() {
        if (!this.storageClient) {
            return null;
        }
        const raw = await this.storageClient.get(this.storageKey);
        if (!raw) {
            return null;
        }
        return this.sanitizeData(raw);
    }
    loadFromFile() {
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
        }
        catch (error) {
            console.error('Failed to load JSON database, fallback seed initialized.', error);
            return this.createSeedData();
        }
    }
    async saveToKv(nextState) {
        if (!this.storageClient) {
            return;
        }
        await this.storageClient.set(this.storageKey, nextState);
    }
    saveToFile(nextState) {
        try {
            fs.writeFileSync(this.filePath, JSON.stringify(nextState, null, 2), 'utf-8');
        }
        catch (error) {
            console.error('Failed to save JSON database:', error);
        }
    }
    async persist(nextState) {
        if (this.storageClient) {
            try {
                await this.saveToKv(nextState);
                return;
            }
            catch (error) {
                console.error('Failed to persist with KV, fallback file storage used.', error);
            }
        }
        this.saveToFile(nextState);
    }
    async load() {
        if (this.initialized) {
            return;
        }
        try {
            const loaded = await this.loadFromKv();
            if (loaded) {
                this.data = loaded;
            }
            else {
                this.data = this.loadFromFile();
            }
        }
        catch (error) {
            console.error('Failed to initialize database, fallback file storage.', error);
            this.data = this.loadFromFile();
        }
        this.initialized = true;
    }
    async sync() {
        if (this.storageClient) {
            try {
                const latest = await this.loadFromKv();
                if (latest) {
                    this.data = latest;
                    return;
                }
            }
            catch {
            }
        }
    }
    async refresh() {
        await this.load();
        await this.sync();
    }
    async commit(nextState) {
        this.data = nextState;
        await this.persist(nextState);
    }
    async getPolls() {
        await this.refresh();
        return [...this.data.polls];
    }
    async getPollById(id) {
        await this.refresh();
        return this.data.polls.find((p) => p.id === id);
    }
    async createPoll(poll) {
        await this.refresh();
        const next = {
            ...this.data,
            polls: [poll, ...this.data.polls],
        };
        await this.commit(next);
    }
    async updatePoll(poll) {
        await this.refresh();
        const nextPolls = [...this.data.polls];
        const idx = nextPolls.findIndex((p) => p.id === poll.id);
        if (idx === -1) {
            return;
        }
        nextPolls[idx] = poll;
        await this.commit({ ...this.data, polls: nextPolls });
    }
    async getUsers() {
        await this.refresh();
        return [...this.data.users];
    }
    async getUserByEmail(email) {
        const target = this.sanitizeEmails(email);
        await this.refresh();
        return this.data.users.find((u) => this.sanitizeEmails(u.email) === target);
    }
    async getUserById(id) {
        await this.refresh();
        return this.data.users.find((u) => u.id === id);
    }
    async createUser(user) {
        await this.refresh();
        const next = {
            ...this.data,
            users: [...this.data.users, user],
        };
        await this.commit(next);
    }
};
exports.DatabaseService = DatabaseService;
exports.DatabaseService = DatabaseService = __decorate([
    (0, common_1.Injectable)()
], DatabaseService);
//# sourceMappingURL=database.service.js.map