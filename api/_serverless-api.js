"use strict";
var __getOwnPropNames = Object.getOwnPropertyNames;
var __commonJS = (cb, mod) => function __require() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};

// apps/api/dist/modules/database/database.service.js
var require_database_service = __commonJS({
  "apps/api/dist/modules/database/database.service.js"(exports2) {
    "use strict";
    var __createBinding = exports2 && exports2.__createBinding || (Object.create ? (function(o, m, k, k2) {
      if (k2 === void 0) k2 = k;
      var desc = Object.getOwnPropertyDescriptor(m, k);
      if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
        desc = { enumerable: true, get: function() {
          return m[k];
        } };
      }
      Object.defineProperty(o, k2, desc);
    }) : (function(o, m, k, k2) {
      if (k2 === void 0) k2 = k;
      o[k2] = m[k];
    }));
    var __setModuleDefault = exports2 && exports2.__setModuleDefault || (Object.create ? (function(o, v) {
      Object.defineProperty(o, "default", { enumerable: true, value: v });
    }) : function(o, v) {
      o["default"] = v;
    });
    var __decorate = exports2 && exports2.__decorate || function(decorators, target, key, desc) {
      var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
      if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
      else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
      return c > 3 && r && Object.defineProperty(target, key, r), r;
    };
    var __importStar = exports2 && exports2.__importStar || /* @__PURE__ */ (function() {
      var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function(o2) {
          var ar = [];
          for (var k in o2) if (Object.prototype.hasOwnProperty.call(o2, k)) ar[ar.length] = k;
          return ar;
        };
        return ownKeys(o);
      };
      return function(mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) {
          for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        }
        __setModuleDefault(result, mod);
        return result;
      };
    })();
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.DatabaseService = void 0;
    var common_1 = require("@nestjs/common");
    var fs = __importStar(require("fs"));
    var path = __importStar(require("path"));
    var kv_1 = require("@vercel/kv");
    var DatabaseService = class DatabaseService {
      storageKey = "picky:database:v1";
      filePath = path.resolve(process.env.PICKY_DB_PATH?.trim() || (process.env.NODE_ENV === "production" ? "/tmp/picky-db.json" : path.resolve(process.cwd(), "db.json")));
      storageClient = this.createStorageClient();
      requiresDurableStorage = (process.env.NODE_ENV === "production" || process.env.VERCEL === "1" || Boolean(process.env.VERCEL_ENV)) && process.env.PICKY_ALLOW_EPHEMERAL_STORAGE !== "true";
      data = { polls: [], users: [] };
      initialized = false;
      async onModuleInit() {
        try {
          await this.load();
        } catch (error) {
          if (this.requiresDurableStorage) {
            console.error("Durable storage is not ready. Requests will fail until it is configured.");
            return;
          }
          throw error;
        }
      }
      createStorageClient() {
        const url = process.env.KV_REST_API_URL?.trim();
        const token = process.env.KV_REST_API_TOKEN?.trim();
        if (!url || !token) {
          return null;
        }
        try {
          return (0, kv_1.createClient)({ url, token });
        } catch {
          return null;
        }
      }
      createSeedData() {
        return {
          polls: [
            {
              id: "seed-onboarding-poll",
              question: "WebstormProjects \uAC1C\uC778 \uD504\uB85C\uC81D\uD2B8\uB4E4 \uC911 \uC5B4\uB5A4 \uAC83\uC744 \uAC00\uC7A5 \uBA3C\uC800 \uC0C1\uC6A9 \uC11C\uBE44\uC2A4\uD654 \uC2DC\uD0AC\uAE4C\uC694?",
              description: "\uC77C\uC0C1\uC5D0\uC11C \uACE0\uBBFC\uB418\uB294 \uAC83\uB4E4\uC744 \uC9C0\uC778\uB4E4\uC5D0\uAC8C \uC27D\uAC8C \uBB3C\uC5B4\uBCF4\uB294 pickflow(\uD53C\uD0A4) \uC11C\uBE44\uC2A4 \uCD9C\uC2DC\uB97C \uCD95\uD558\uD558\uBA70, \uB2E4\uC74C \uAC1C\uC778 \uD504\uB85C\uC81D\uD2B8 \uC911 \uD558\uB098\uB97C \uC0C1\uC6A9 \uB7F0\uCE6D\uD558\uACE0 \uC2F6\uC2B5\uB2C8\uB2E4. \uC5EC\uB7EC\uBD84\uC758 \uC120\uD0DD\uC740?",
              options: [
                {
                  id: 1,
                  text: "PromptMarket (\uD504\uB86C\uD504\uD2B8/\uC5D0\uC774\uC804\uD2B8 \uB9C8\uCF13)",
                  voteCount: 15,
                  imageUrl: null
                },
                {
                  id: 2,
                  text: "proto-live (\uBC14\uC774\uBE0C\uCF54\uB529 \uCF54\uB4DC \uACF5\uC720 \uD50C\uB7AB\uD3FC)",
                  voteCount: 12,
                  imageUrl: "https://images.unsplash.com/photo-1542831371-29b0f74f9713?w=400&q=80"
                },
                {
                  id: 3,
                  text: "family-care-platform (\uC2E4\uBC84 \uCF00\uC5B4 \uB9E4\uCE6D \uC11C\uBE44\uC2A4)",
                  voteCount: 8,
                  imageUrl: "https://images.unsplash.com/photo-1576765608535-5f04d1e3f289?w=400&q=80"
                },
                {
                  id: 4,
                  text: "orbit-ui (\uC720\uB824\uD55C \uAE00\uB77C\uC2A4\uBAA8\uD53C\uC998 \uCEF4\uD3EC\uB10C\uD2B8 \uD0B7)",
                  voteCount: 19,
                  imageUrl: "https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?w=400&q=80"
                }
              ],
              comments: [
                {
                  id: 1,
                  voterName: "\uC2DC\uB2C8\uC5B4FE",
                  comment: "PromptMarket\uC774 \uC694\uC998 AI \uD2B8\uB80C\uB4DC\uC5D0 \uAC00\uC7A5 \uC815\uD569\uD574\uC11C \uBE44\uC988\uB2C8\uC2A4 \uC7A0\uC7AC\uB825\uC774 \uD07D\uB2C8\uB2E4!",
                  createdAt: (/* @__PURE__ */ new Date()).toISOString(),
                  selectedOptionId: 1,
                  selectedOptionText: "PromptMarket (\uD504\uB86C\uD504\uD2B8/\uC5D0\uC774\uC804\uD2B8 \uB9C8\uCF13)"
                },
                {
                  id: 2,
                  voterName: "\uAE40\uD76C\uC900",
                  comment: "\uC5ED\uC2DC Orbit UI \uAC00 \uC720\uB824\uD55C \uCEF4\uD3EC\uB10C\uD2B8 \uD0B7\uC774\uB77C \uB514\uC790\uC774\uB108\uB4E4\uC5D0\uAC8C \uC778\uAE30\uAC00 \uB9CE\uC744 \uAC83 \uAC19\uB124\uC694.",
                  createdAt: (/* @__PURE__ */ new Date()).toISOString(),
                  selectedOptionId: 4,
                  selectedOptionText: "orbit-ui (\uC720\uB824\uD55C \uAE00\uB77C\uC2A4\uBAA8\uD53C\uC998 \uCEF4\uD3EC\uB10C\uD2B8 \uD0B7)"
                }
              ],
              createdAt: (/* @__PURE__ */ new Date()).toISOString(),
              totalVotes: 54
            }
          ],
          users: []
        };
      }
      sanitizeEmails(value) {
        return (value || "").trim().toLowerCase();
      }
      sanitizeData(candidate) {
        const raw = candidate;
        const polls = Array.isArray(raw?.polls) ? raw?.polls : [];
        const users = Array.isArray(raw?.users) ? raw.users.filter((user) => user && typeof user.id === "string" && typeof user.email === "string").map((user) => ({
          id: String(user.id),
          email: String(user.email || ""),
          passwordHash: String(user.passwordHash || ""),
          salt: String(user.salt || ""),
          nickname: String(user.nickname || ""),
          createdAt: String(user.createdAt || (/* @__PURE__ */ new Date()).toISOString()),
          isGuest: Boolean(user.isGuest)
        })) : [];
        return {
          polls: polls.filter((poll) => poll && typeof poll.id === "string" && typeof poll.question === "string").map((poll) => ({
            ...poll,
            options: Array.isArray(poll.options) ? poll.options : [],
            comments: Array.isArray(poll.comments) ? poll.comments : [],
            createdAt: String(poll.createdAt || (/* @__PURE__ */ new Date()).toISOString()),
            totalVotes: typeof poll.totalVotes === "number" ? poll.totalVotes : Number(poll.totalVotes) || 0
          })),
          users: users.map((user) => ({
            ...user,
            email: this.sanitizeEmails(user.email)
          }))
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
          const fileContent = fs.readFileSync(this.filePath, "utf-8");
          const parsed = JSON.parse(fileContent);
          const next = this.sanitizeData(parsed);
          if (next.polls.length === 0 && next.users.length === 0) {
            return this.createSeedData();
          }
          return next;
        } catch (error) {
          console.error("Failed to load JSON database, fallback seed initialized.", error);
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
          fs.writeFileSync(this.filePath, JSON.stringify(nextState, null, 2), "utf-8");
        } catch (error) {
          console.error("Failed to save JSON database:", error);
        }
      }
      async persist(nextState) {
        if (this.storageClient) {
          try {
            await this.saveToKv(nextState);
            return;
          } catch (error) {
            console.error("Failed to persist with KV.", error);
            if (this.requiresDurableStorage) {
              throw new common_1.ServiceUnavailableException("\uC601\uC18D \uC800\uC7A5\uC18C\uC5D0 \uC800\uC7A5\uD558\uC9C0 \uBABB\uD588\uC2B5\uB2C8\uB2E4. Vercel KV/Upstash \uC5F0\uACB0 \uC0C1\uD0DC\uB97C \uD655\uC778\uD574 \uC8FC\uC138\uC694.");
            }
          }
        }
        if (this.requiresDurableStorage) {
          throw new common_1.ServiceUnavailableException("Production\uC5D0\uB294 \uC601\uC18D \uC800\uC7A5\uC18C\uAC00 \uD544\uC694\uD569\uB2C8\uB2E4. KV_REST_API_URL/KV_REST_API_TOKEN\uC744 \uC124\uC815\uD574 \uC8FC\uC138\uC694.");
        }
        this.saveToFile(nextState);
      }
      async load() {
        if (this.initialized) {
          return;
        }
        if (this.requiresDurableStorage && !this.storageClient) {
          throw new common_1.ServiceUnavailableException("Production\uC5D0\uB294 \uC601\uC18D \uC800\uC7A5\uC18C\uAC00 \uD544\uC694\uD569\uB2C8\uB2E4. KV_REST_API_URL/KV_REST_API_TOKEN\uC744 \uC124\uC815\uD574 \uC8FC\uC138\uC694.");
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
          console.error("Failed to initialize database.", error);
          if (this.requiresDurableStorage) {
            throw new common_1.ServiceUnavailableException("\uC601\uC18D \uC800\uC7A5\uC18C\uB97C \uCD08\uAE30\uD654\uD558\uC9C0 \uBABB\uD588\uC2B5\uB2C8\uB2E4. Vercel KV/Upstash \uC5F0\uACB0 \uC0C1\uD0DC\uB97C \uD655\uC778\uD574 \uC8FC\uC138\uC694.");
          }
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
          } catch (error) {
            if (this.requiresDurableStorage) {
              console.error("Failed to sync durable storage.", error);
              throw new common_1.ServiceUnavailableException("\uC601\uC18D \uC800\uC7A5\uC18C\uC640 \uB3D9\uAE30\uD654\uD558\uC9C0 \uBABB\uD588\uC2B5\uB2C8\uB2E4. Vercel KV/Upstash \uC5F0\uACB0 \uC0C1\uD0DC\uB97C \uD655\uC778\uD574 \uC8FC\uC138\uC694.");
            }
          }
        }
        if (this.requiresDurableStorage) {
          throw new common_1.ServiceUnavailableException("Production\uC5D0\uB294 \uC601\uC18D \uC800\uC7A5\uC18C\uAC00 \uD544\uC694\uD569\uB2C8\uB2E4. KV_REST_API_URL/KV_REST_API_TOKEN\uC744 \uC124\uC815\uD574 \uC8FC\uC138\uC694.");
        }
      }
      async refresh() {
        await this.load();
        await this.sync();
      }
      async commit(nextState) {
        await this.persist(nextState);
        this.data = nextState;
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
          polls: [poll, ...this.data.polls]
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
      async deletePoll(id) {
        await this.refresh();
        const exists = this.data.polls.some((p) => p.id === id);
        if (!exists) {
          return false;
        }
        const nextPolls = this.data.polls.filter((p) => p.id !== id);
        await this.commit({ ...this.data, polls: nextPolls });
        return true;
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
          users: [...this.data.users, user]
        };
        await this.commit(next);
      }
    };
    exports2.DatabaseService = DatabaseService;
    exports2.DatabaseService = DatabaseService = __decorate([
      (0, common_1.Injectable)()
    ], DatabaseService);
  }
});

// apps/api/dist/modules/database/database.module.js
var require_database_module = __commonJS({
  "apps/api/dist/modules/database/database.module.js"(exports2) {
    "use strict";
    var __decorate = exports2 && exports2.__decorate || function(decorators, target, key, desc) {
      var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
      if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
      else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
      return c > 3 && r && Object.defineProperty(target, key, r), r;
    };
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.DatabaseModule = void 0;
    var common_1 = require("@nestjs/common");
    var database_service_1 = require_database_service();
    var DatabaseModule = class DatabaseModule {
    };
    exports2.DatabaseModule = DatabaseModule;
    exports2.DatabaseModule = DatabaseModule = __decorate([
      (0, common_1.Global)(),
      (0, common_1.Module)({
        providers: [database_service_1.DatabaseService],
        exports: [database_service_1.DatabaseService]
      })
    ], DatabaseModule);
  }
});

// apps/api/dist/modules/auth/auth.service.js
var require_auth_service = __commonJS({
  "apps/api/dist/modules/auth/auth.service.js"(exports2) {
    "use strict";
    var __createBinding = exports2 && exports2.__createBinding || (Object.create ? (function(o, m, k, k2) {
      if (k2 === void 0) k2 = k;
      var desc = Object.getOwnPropertyDescriptor(m, k);
      if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
        desc = { enumerable: true, get: function() {
          return m[k];
        } };
      }
      Object.defineProperty(o, k2, desc);
    }) : (function(o, m, k, k2) {
      if (k2 === void 0) k2 = k;
      o[k2] = m[k];
    }));
    var __setModuleDefault = exports2 && exports2.__setModuleDefault || (Object.create ? (function(o, v) {
      Object.defineProperty(o, "default", { enumerable: true, value: v });
    }) : function(o, v) {
      o["default"] = v;
    });
    var __decorate = exports2 && exports2.__decorate || function(decorators, target, key, desc) {
      var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
      if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
      else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
      return c > 3 && r && Object.defineProperty(target, key, r), r;
    };
    var __importStar = exports2 && exports2.__importStar || /* @__PURE__ */ (function() {
      var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function(o2) {
          var ar = [];
          for (var k in o2) if (Object.prototype.hasOwnProperty.call(o2, k)) ar[ar.length] = k;
          return ar;
        };
        return ownKeys(o);
      };
      return function(mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) {
          for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        }
        __setModuleDefault(result, mod);
        return result;
      };
    })();
    var __metadata = exports2 && exports2.__metadata || function(k, v) {
      if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
    };
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.AuthService = void 0;
    var common_1 = require("@nestjs/common");
    var jwt_1 = require("@nestjs/jwt");
    var crypto = __importStar(require("crypto"));
    var https = __importStar(require("https"));
    var fs = __importStar(require("fs"));
    var database_service_1 = require_database_service();
    var APPS_IN_TOSS_API_BASE = "https://apps-in-toss-api.toss.im";
    var AuthService = class AuthService {
      db;
      jwtService;
      constructor(db, jwtService) {
        this.db = db;
        this.jwtService = jwtService;
      }
      hashPassword(password, salt) {
        return crypto.pbkdf2Sync(password, salt, 1e3, 64, "sha512").toString("hex");
      }
      generateSalt() {
        return crypto.randomBytes(16).toString("hex");
      }
      async signPayload(payload) {
        return this.jwtService.signAsync(payload);
      }
      toProfile(user) {
        return {
          id: user.id,
          email: user.email,
          nickname: user.nickname,
          createdAt: user.createdAt,
          isGuest: user.isGuest
        };
      }
      async register(input) {
        const normalizedEmail = input.email.trim().toLowerCase();
        const normalizedNickname = input.nickname.trim();
        const existing = await this.db.getUserByEmail(normalizedEmail);
        if (existing) {
          throw new common_1.BadRequestException("\uC774\uBBF8 \uB4F1\uB85D\uB41C \uC774\uBA54\uC77C \uC8FC\uC18C\uC785\uB2C8\uB2E4.");
        }
        const salt = this.generateSalt();
        const passwordHash = this.hashPassword(input.password, salt);
        const userId = crypto.randomUUID();
        const newUser = {
          id: userId,
          email: normalizedEmail,
          passwordHash,
          salt,
          nickname: normalizedNickname,
          createdAt: (/* @__PURE__ */ new Date()).toISOString(),
          isGuest: false
        };
        await this.db.createUser(newUser);
        const accessToken = await this.signPayload({
          sub: newUser.id,
          email: newUser.email,
          nickname: newUser.nickname,
          isGuest: false
        });
        return {
          accessToken,
          user: this.toProfile(newUser)
        };
      }
      async registerGuest(input) {
        const normalizedNickname = input.nickname.trim();
        const userId = `guest-${crypto.randomUUID()}`;
        const guestUser = {
          id: userId,
          email: "",
          passwordHash: "",
          salt: "",
          nickname: normalizedNickname,
          createdAt: (/* @__PURE__ */ new Date()).toISOString(),
          isGuest: true
        };
        await this.db.createUser(guestUser);
        const accessToken = await this.signPayload({
          sub: guestUser.id,
          email: guestUser.email,
          nickname: guestUser.nickname,
          isGuest: true
        });
        return {
          accessToken,
          user: this.toProfile(guestUser)
        };
      }
      async login(input) {
        const normalizedEmail = input.email.trim().toLowerCase();
        const user = await this.db.getUserByEmail(normalizedEmail);
        if (!user || user.isGuest) {
          throw new common_1.UnauthorizedException("\uC774\uBA54\uC77C \uB610\uB294 \uBE44\uBC00\uBC88\uD638\uAC00 \uC62C\uBC14\uB974\uC9C0 \uC54A\uC2B5\uB2C8\uB2E4.");
        }
        const hash = this.hashPassword(input.password, user.salt);
        if (hash !== user.passwordHash) {
          throw new common_1.UnauthorizedException("\uC774\uBA54\uC77C \uB610\uB294 \uBE44\uBC00\uBC88\uD638\uAC00 \uC62C\uBC14\uB974\uC9C0 \uC54A\uC2B5\uB2C8\uB2E4.");
        }
        const accessToken = await this.signPayload({
          sub: user.id,
          email: user.email,
          nickname: user.nickname,
          isGuest: false
        });
        return {
          accessToken,
          user: this.toProfile(user)
        };
      }
      async loginWithTossIdentity(input) {
        const fingerprint = crypto.createHash("sha256").update(input.anonymousKey).digest("hex").slice(0, 32);
        const userId = `toss-${fingerprint}`;
        const nickname = (input.nickname?.trim() || "\uD1A0\uC2A4 \uC0AC\uC6A9\uC790").slice(0, 20);
        let user = await this.db.getUserById(userId);
        if (!user) {
          user = {
            id: userId,
            email: "",
            passwordHash: "",
            salt: "",
            nickname,
            createdAt: (/* @__PURE__ */ new Date()).toISOString(),
            isGuest: false
          };
          await this.db.createUser(user);
        }
        const accessToken = await this.signPayload({
          sub: user.id,
          email: user.email,
          nickname: user.nickname,
          isGuest: user.isGuest
        });
        return { accessToken, user: this.toProfile(user) };
      }
      async loginWithTossAuthCode(input) {
        const agent = this.createMtlsAgent();
        const tokenResponse = await this.requestTossApi("POST", "/api-partner/v1/apps-in-toss/user/oauth2/generate-token", agent, {
          body: { authorizationCode: input.authorizationCode, referrer: input.referrer ?? "DEFAULT" }
        });
        const tossAccessToken = tokenResponse?.success?.accessToken;
        if (!tossAccessToken) {
          throw new common_1.UnauthorizedException("\uD1A0\uC2A4 \uB85C\uADF8\uC778 \uD1A0\uD070 \uBC1C\uAE09\uC5D0 \uC2E4\uD328\uD588\uC5B4\uC694.");
        }
        const meResponse = await this.requestTossApi("GET", "/api-partner/v1/apps-in-toss/user/oauth2/login-me", agent, {
          bearer: tossAccessToken
        });
        const userKey = meResponse?.success?.userKey;
        if (userKey == null) {
          throw new common_1.UnauthorizedException("\uD1A0\uC2A4 \uC0AC\uC6A9\uC790 \uC815\uBCF4\uB97C \uAC00\uC838\uC624\uC9C0 \uBABB\uD588\uC5B4\uC694.");
        }
        const userId = `toss-user-${userKey}`;
        let user = await this.db.getUserById(userId);
        if (!user) {
          user = {
            id: userId,
            email: "",
            passwordHash: "",
            salt: "",
            nickname: "\uD1A0\uC2A4 \uC0AC\uC6A9\uC790",
            createdAt: (/* @__PURE__ */ new Date()).toISOString(),
            isGuest: false
          };
          await this.db.createUser(user);
        }
        const accessToken = await this.signPayload({
          sub: user.id,
          email: user.email,
          nickname: user.nickname,
          isGuest: user.isGuest
        });
        return { accessToken, user: this.toProfile(user) };
      }
      createMtlsAgent() {
        const certPath = process.env.APPS_IN_TOSS_MTLS_CERT_PATH?.trim();
        const keyPath = process.env.APPS_IN_TOSS_MTLS_KEY_PATH?.trim();
        if (!certPath || !keyPath) {
          throw new common_1.ServiceUnavailableException("\uD1A0\uC2A4 \uB85C\uADF8\uC778(\uC11C\uBC84 mTLS) \uC778\uC99D\uC11C\uAC00 \uC124\uC815\uB418\uC9C0 \uC54A\uC558\uC5B4\uC694. \uCF58\uC194\uC5D0\uC11C mTLS \uC778\uC99D\uC11C\uB97C \uBC1C\uAE09\uD574 APPS_IN_TOSS_MTLS_CERT_PATH/KEY_PATH \uD658\uACBD\uBCC0\uC218\uC5D0 \uC124\uC815\uD558\uAC70\uB098, getAnonymousKey \uAE30\uBC18 \uC2DD\uBCC4 \uB85C\uADF8\uC778\uC744 \uC0AC\uC6A9\uD574 \uC8FC\uC138\uC694.");
        }
        return new https.Agent({ cert: fs.readFileSync(certPath), key: fs.readFileSync(keyPath) });
      }
      requestTossApi(method, path, agent, options = {}) {
        return new Promise((resolve, reject) => {
          const url = new URL(`${APPS_IN_TOSS_API_BASE}${path}`);
          const payload = options.body == null ? void 0 : JSON.stringify(options.body);
          const request = https.request(url, {
            method,
            agent,
            headers: {
              "Content-Type": "application/json",
              ...options.bearer ? { Authorization: `Bearer ${options.bearer}` } : {},
              ...payload ? { "Content-Length": Buffer.byteLength(payload) } : {}
            }
          }, (response) => {
            let raw = "";
            response.on("data", (chunk) => {
              raw += chunk;
            });
            response.on("end", () => {
              try {
                resolve(raw ? JSON.parse(raw) : {});
              } catch {
                reject(new common_1.UnauthorizedException("\uD1A0\uC2A4 API \uC751\uB2F5\uC744 \uD574\uC11D\uD558\uC9C0 \uBABB\uD588\uC5B4\uC694."));
              }
            });
          });
          request.on("error", (error) => reject(error));
          if (payload) {
            request.write(payload);
          }
          request.end();
        });
      }
      async validateUser(payload) {
        if (!payload?.sub || typeof payload?.sub !== "string") {
          throw new common_1.UnauthorizedException("\uC720\uD6A8\uD558\uC9C0 \uC54A\uC740 \uC0AC\uC6A9\uC790\uC785\uB2C8\uB2E4.");
        }
        if (payload.isGuest === void 0 || typeof payload.nickname !== "string" || typeof payload.email !== "string") {
          const user = await this.db.getUserById(payload.sub);
          if (!user) {
            throw new common_1.UnauthorizedException("\uC720\uD6A8\uD558\uC9C0 \uC54A\uC740 \uC0AC\uC6A9\uC790\uC785\uB2C8\uB2E4.");
          }
          return this.toProfile(user);
        }
        return {
          id: payload.sub,
          email: payload.email,
          nickname: payload.nickname,
          createdAt: (/* @__PURE__ */ new Date()).toISOString(),
          isGuest: payload.isGuest
        };
      }
    };
    exports2.AuthService = AuthService;
    exports2.AuthService = AuthService = __decorate([
      (0, common_1.Injectable)(),
      __metadata("design:paramtypes", [
        database_service_1.DatabaseService,
        jwt_1.JwtService
      ])
    ], AuthService);
  }
});

// packages/shared/dist/index.cjs
var require_dist = __commonJS({
  "packages/shared/dist/index.cjs"(exports2, module2) {
    "use strict";
    var __defProp = Object.defineProperty;
    var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
    var __getOwnPropNames2 = Object.getOwnPropertyNames;
    var __hasOwnProp = Object.prototype.hasOwnProperty;
    var __export = (target, all) => {
      for (var name in all)
        __defProp(target, name, { get: all[name], enumerable: true });
    };
    var __copyProps = (to, from, except, desc) => {
      if (from && typeof from === "object" || typeof from === "function") {
        for (let key of __getOwnPropNames2(from))
          if (!__hasOwnProp.call(to, key) && key !== except)
            __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
      }
      return to;
    };
    var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
    var index_exports = {};
    __export(index_exports, {
      CreatePollSchema: () => CreatePollSchema,
      GuestRegisterSchema: () => GuestRegisterSchema,
      LoginSchema: () => LoginSchema,
      PollAttachmentSchema: () => PollAttachmentSchema,
      PollResultsVisibilitySchema: () => PollResultsVisibilitySchema,
      RegisterSchema: () => RegisterSchema,
      TossIdentitySchema: () => TossIdentitySchema,
      TossLoginSchema: () => TossLoginSchema,
      VoteSchema: () => VoteSchema
    });
    module2.exports = __toCommonJS(index_exports);
    var import_zod = require("zod");
    var PollResultsVisibilitySchema = import_zod.z.enum(["afterVote", "always"]);
    var PollAttachmentSchema = import_zod.z.object({
      name: import_zod.z.string().min(1, "\uCCA8\uBD80\uD30C\uC77C \uC774\uB984\uC740 \uD544\uC218\uC785\uB2C8\uB2E4.").max(120, "\uCCA8\uBD80\uD30C\uC77C \uC774\uB984\uC740 120\uC790 \uC774\uD558\uC774\uC5B4\uC57C \uD569\uB2C8\uB2E4."),
      type: import_zod.z.string().max(80, "\uCCA8\uBD80\uD30C\uC77C \uD615\uC2DD\uC740 80\uC790 \uC774\uD558\uC774\uC5B4\uC57C \uD569\uB2C8\uB2E4."),
      size: import_zod.z.number().int().min(1, "\uCCA8\uBD80\uD30C\uC77C \uD06C\uAE30\uAC00 \uC62C\uBC14\uB974\uC9C0 \uC54A\uC2B5\uB2C8\uB2E4.").max(3e5, "\uCCA8\uBD80\uD30C\uC77C\uC740 300KB \uC774\uD558\uB9CC \uB4F1\uB85D\uD560 \uC218 \uC788\uC2B5\uB2C8\uB2E4."),
      dataUrl: import_zod.z.string().max(42e4, "\uCCA8\uBD80\uD30C\uC77C \uB370\uC774\uD130\uB294 \uD30C\uC77C\uB2F9 420KB \uC774\uD558\uC774\uC5B4\uC57C \uD569\uB2C8\uB2E4.")
    });
    var CreatePollSchema = import_zod.z.object({
      question: import_zod.z.string().min(2, "\uC9C8\uBB38\uC740 \uCD5C\uC18C 2\uAE00\uC790 \uC774\uC0C1\uC774\uC5B4\uC57C \uD569\uB2C8\uB2E4.").max(100, "\uC9C8\uBB38\uC740 \uCD5C\uB300 100\uAE00\uC790 \uC774\uD558\uC774\uC5B4\uC57C \uD569\uB2C8\uB2E4."),
      description: import_zod.z.string().max(500, "\uC124\uBA85\uC740 \uCD5C\uB300 500\uAE00\uC790 \uC774\uD558\uC774\uC5B4\uC57C \uD569\uB2C8\uB2E4.").optional().nullable(),
      endsAt: import_zod.z.string().datetime("\uB9C8\uAC10 \uC2DC\uAC04 \uD615\uC2DD\uC774 \uC62C\uBC14\uB974\uC9C0 \uC54A\uC2B5\uB2C8\uB2E4.").optional().nullable(),
      resultsVisibility: PollResultsVisibilitySchema.optional().nullable(),
      options: import_zod.z.array(
        import_zod.z.object({
          text: import_zod.z.string().min(1, "\uC120\uD0DD\uC9C0\uB294 \uBE48 \uCE78\uC77C \uC218 \uC5C6\uC2B5\uB2C8\uB2E4."),
          imageUrl: import_zod.z.string().max(16e4, "\uC774\uBBF8\uC9C0 \uB370\uC774\uD130\uB294 \uC120\uD0DD\uC9C0\uB2F9 160KB \uC774\uD558\uC774\uC5B4\uC57C \uD569\uB2C8\uB2E4.").optional().nullable()
        })
      ).min(2, "\uCD5C\uC18C 2\uAC1C \uC774\uC0C1\uC758 \uC120\uD0DD\uC9C0\uAC00 \uD544\uC694\uD569\uB2C8\uB2E4.").max(10, "\uCD5C\uB300 10\uAC1C\uAE4C\uC9C0\uC758 \uC120\uD0DD\uC9C0\uB9CC \uB4F1\uB85D \uAC00\uB2A5\uD569\uB2C8\uB2E4."),
      attachments: import_zod.z.array(PollAttachmentSchema).max(3, "\uCCA8\uBD80\uD30C\uC77C\uC740 \uCD5C\uB300 3\uAC1C\uAE4C\uC9C0 \uB4F1\uB85D \uAC00\uB2A5\uD569\uB2C8\uB2E4.").optional().nullable(),
      categoryId: import_zod.z.string().optional().nullable()
    });
    var VoteSchema = import_zod.z.object({
      optionId: import_zod.z.number({ required_error: "\uC120\uD0DD\uD560 \uC635\uC158 ID\uAC00 \uD544\uC694\uD569\uB2C8\uB2E4." }),
      voterName: import_zod.z.string().max(20, "\uD22C\uD45C\uC790 \uB2C9\uB124\uC784\uC740 \uCD5C\uB300 20\uC790 \uC774\uD558\uC774\uC5B4\uC57C \uD569\uB2C8\uB2E4.").optional().nullable(),
      comment: import_zod.z.string().max(100, "\uC758\uACAC\uC740 \uCD5C\uB300 100\uC790 \uC774\uD558\uC774\uC5B4\uC57C \uD569\uB2C8\uB2E4.").optional().nullable()
    });
    var RegisterSchema = import_zod.z.object({
      email: import_zod.z.string({ required_error: "\uC774\uBA54\uC77C\uC740 \uD544\uC218\uC785\uB2C8\uB2E4." }).trim().email("\uC62C\uBC14\uB978 \uC774\uBA54\uC77C \uD615\uC2DD\uC774 \uC544\uB2D9\uB2C8\uB2E4."),
      password: import_zod.z.string({ required_error: "\uBE44\uBC00\uBC88\uD638\uB294 \uD544\uC218\uC785\uB2C8\uB2E4." }).min(6, "\uBE44\uBC00\uBC88\uD638\uB294 \uCD5C\uC18C 6\uC790 \uC774\uC0C1\uC774\uC5B4\uC57C \uD569\uB2C8\uB2E4."),
      nickname: import_zod.z.string().trim().min(2, "\uB2C9\uB124\uC784\uC740 \uCD5C\uC18C 2\uC790 \uC774\uC0C1\uC774\uC5B4\uC57C \uD569\uB2C8\uB2E4.").max(20, "\uB2C9\uB124\uC784\uC740 \uCD5C\uB300 20\uC790 \uC774\uD558\uC774\uC5B4\uC57C \uD569\uB2C8\uB2E4.").optional(),
      name: import_zod.z.string().trim().min(2, "\uB2C9\uB124\uC784\uC740 \uCD5C\uC18C 2\uC790 \uC774\uC0C1\uC774\uC5B4\uC57C \uD569\uB2C8\uB2E4.").max(20, "\uB2C9\uB124\uC784\uC740 \uCD5C\uB300 20\uC790 \uC774\uD558\uC774\uC5B4\uC57C \uD569\uB2C8\uB2E4.").optional()
    }).superRefine((value, ctx) => {
      const resolved = value.nickname ?? value.name;
      if (!resolved || !resolved.trim()) {
        ctx.addIssue({
          code: "custom",
          message: "\uB2C9\uB124\uC784\uC740 \uCD5C\uC18C 2\uC790 \uC774\uC0C1\uC774\uC5B4\uC57C \uD569\uB2C8\uB2E4.",
          path: ["nickname"]
        });
      }
    }).transform(({ email, password, nickname, name }) => ({
      email,
      password,
      nickname: (nickname ?? name ?? "").trim()
    }));
    var LoginSchema = import_zod.z.object({
      email: import_zod.z.string({ required_error: "\uC774\uBA54\uC77C\uC740 \uD544\uC218\uC785\uB2C8\uB2E4." }).trim().email("\uC62C\uBC14\uB978 \uC774\uBA54\uC77C \uD615\uC2DD\uC774 \uC544\uB2D9\uB2C8\uB2E4."),
      password: import_zod.z.string({ required_error: "\uBE44\uBC00\uBC88\uD638\uB294 \uD544\uC218\uC785\uB2C8\uB2E4." }).min(6, "\uBE44\uBC00\uBC88\uD638\uB294 \uCD5C\uC18C 6\uC790 \uC774\uC0C1\uC774\uC5B4\uC57C \uD569\uB2C8\uB2E4.")
    });
    var GuestRegisterSchema = import_zod.z.object({
      nickname: import_zod.z.string({ required_error: "\uB2C9\uB124\uC784\uC740 \uD544\uC218\uC785\uB2C8\uB2E4." }).trim().min(2, "\uB2C9\uB124\uC784\uC740 \uCD5C\uC18C 2\uC790 \uC774\uC0C1\uC774\uC5B4\uC57C \uD569\uB2C8\uB2E4.").max(20, "\uB2C9\uB124\uC784\uC740 \uCD5C\uB300 20\uC790 \uC774\uD558\uC774\uC5B4\uC57C \uD569\uB2C8\uB2E4.")
    });
    var TossIdentitySchema = import_zod.z.object({
      anonymousKey: import_zod.z.string({ required_error: "\uD1A0\uC2A4 \uC0AC\uC6A9\uC790 \uC2DD\uBCC4\uD0A4\uAC00 \uD544\uC694\uD569\uB2C8\uB2E4." }).trim().min(8, "\uC720\uD6A8\uD558\uC9C0 \uC54A\uC740 \uC2DD\uBCC4\uD0A4\uC785\uB2C8\uB2E4.").max(256, "\uC720\uD6A8\uD558\uC9C0 \uC54A\uC740 \uC2DD\uBCC4\uD0A4\uC785\uB2C8\uB2E4."),
      nickname: import_zod.z.string().trim().max(20, "\uB2C9\uB124\uC784\uC740 \uCD5C\uB300 20\uC790 \uC774\uD558\uC774\uC5B4\uC57C \uD569\uB2C8\uB2E4.").optional().nullable()
    });
    var TossLoginSchema = import_zod.z.object({
      authorizationCode: import_zod.z.string({ required_error: "\uC778\uAC00 \uCF54\uB4DC\uAC00 \uD544\uC694\uD569\uB2C8\uB2E4." }).trim().min(1, "\uC778\uAC00 \uCF54\uB4DC\uAC00 \uD544\uC694\uD569\uB2C8\uB2E4."),
      referrer: import_zod.z.string().trim().min(1).optional().nullable()
    });
  }
});

// apps/api/dist/modules/auth/auth.guard.js
var require_auth_guard = __commonJS({
  "apps/api/dist/modules/auth/auth.guard.js"(exports2) {
    "use strict";
    var __decorate = exports2 && exports2.__decorate || function(decorators, target, key, desc) {
      var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
      if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
      else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
      return c > 3 && r && Object.defineProperty(target, key, r), r;
    };
    var __metadata = exports2 && exports2.__metadata || function(k, v) {
      if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
    };
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.OptionalAuthGuard = exports2.AuthGuard = void 0;
    var common_1 = require("@nestjs/common");
    var jwt_1 = require("@nestjs/jwt");
    var AuthGuard = class AuthGuard {
      jwtService;
      constructor(jwtService) {
        this.jwtService = jwtService;
      }
      async canActivate(context) {
        const request = context.switchToHttp().getRequest();
        const token = this.extractTokenFromHeader(request);
        if (!token) {
          throw new common_1.UnauthorizedException("\uB85C\uADF8\uC778\uC774 \uD544\uC694\uD569\uB2C8\uB2E4.");
        }
        try {
          const payload = await this.jwtService.verifyAsync(token, {
            secret: "picky-secret-key-12345!"
          });
          request["user"] = payload;
        } catch {
          throw new common_1.UnauthorizedException("\uC720\uD6A8\uD558\uC9C0 \uC54A\uAC70\uB098 \uB9CC\uB8CC\uB41C \uD1A0\uD070\uC785\uB2C8\uB2E4.");
        }
        return true;
      }
      extractTokenFromHeader(request) {
        const [type, token] = request.headers.authorization?.split(" ") ?? [];
        return type === "Bearer" ? token : void 0;
      }
    };
    exports2.AuthGuard = AuthGuard;
    exports2.AuthGuard = AuthGuard = __decorate([
      (0, common_1.Injectable)(),
      __metadata("design:paramtypes", [jwt_1.JwtService])
    ], AuthGuard);
    var OptionalAuthGuard = class OptionalAuthGuard {
      jwtService;
      constructor(jwtService) {
        this.jwtService = jwtService;
      }
      async canActivate(context) {
        const request = context.switchToHttp().getRequest();
        const token = this.extractTokenFromHeader(request);
        if (token) {
          try {
            const payload = await this.jwtService.verifyAsync(token, {
              secret: "picky-secret-key-12345!"
            });
            request["user"] = payload;
          } catch {
          }
        }
        return true;
      }
      extractTokenFromHeader(request) {
        const [type, token] = request.headers.authorization?.split(" ") ?? [];
        return type === "Bearer" ? token : void 0;
      }
    };
    exports2.OptionalAuthGuard = OptionalAuthGuard;
    exports2.OptionalAuthGuard = OptionalAuthGuard = __decorate([
      (0, common_1.Injectable)(),
      __metadata("design:paramtypes", [jwt_1.JwtService])
    ], OptionalAuthGuard);
  }
});

// apps/api/dist/modules/auth/auth.controller.js
var require_auth_controller = __commonJS({
  "apps/api/dist/modules/auth/auth.controller.js"(exports2) {
    "use strict";
    var __decorate = exports2 && exports2.__decorate || function(decorators, target, key, desc) {
      var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
      if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
      else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
      return c > 3 && r && Object.defineProperty(target, key, r), r;
    };
    var __metadata = exports2 && exports2.__metadata || function(k, v) {
      if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
    };
    var __param = exports2 && exports2.__param || function(paramIndex, decorator) {
      return function(target, key) {
        decorator(target, key, paramIndex);
      };
    };
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.AuthController = void 0;
    var common_1 = require("@nestjs/common");
    var nestjs_zod_1 = require("nestjs-zod");
    var shared_1 = require_dist();
    var auth_service_1 = require_auth_service();
    var auth_guard_1 = require_auth_guard();
    var RegisterDto = class extends (0, nestjs_zod_1.createZodDto)(shared_1.RegisterSchema) {
    };
    var LoginDto = class extends (0, nestjs_zod_1.createZodDto)(shared_1.LoginSchema) {
    };
    var GuestRegisterDto = class extends (0, nestjs_zod_1.createZodDto)(shared_1.GuestRegisterSchema) {
    };
    var TossIdentityDto = class extends (0, nestjs_zod_1.createZodDto)(shared_1.TossIdentitySchema) {
    };
    var TossLoginDto = class extends (0, nestjs_zod_1.createZodDto)(shared_1.TossLoginSchema) {
    };
    var AuthController = class AuthController {
      authService;
      constructor(authService) {
        this.authService = authService;
      }
      async register(dto) {
        return this.authService.register(dto);
      }
      async registerGuest(dto) {
        return this.authService.registerGuest(dto);
      }
      async login(dto) {
        return this.authService.login(dto);
      }
      async loginWithTossIdentity(dto) {
        return this.authService.loginWithTossIdentity(dto);
      }
      async loginWithTossAuthCode(dto) {
        return this.authService.loginWithTossAuthCode(dto);
      }
      async me(req) {
        const user = await this.authService.validateUser(req.user);
        return user;
      }
    };
    exports2.AuthController = AuthController;
    __decorate([
      (0, common_1.Post)("register"),
      __param(0, (0, common_1.Body)()),
      __metadata("design:type", Function),
      __metadata("design:paramtypes", [RegisterDto]),
      __metadata("design:returntype", Promise)
    ], AuthController.prototype, "register", null);
    __decorate([
      (0, common_1.Post)("guest"),
      __param(0, (0, common_1.Body)()),
      __metadata("design:type", Function),
      __metadata("design:paramtypes", [GuestRegisterDto]),
      __metadata("design:returntype", Promise)
    ], AuthController.prototype, "registerGuest", null);
    __decorate([
      (0, common_1.Post)("login"),
      __param(0, (0, common_1.Body)()),
      __metadata("design:type", Function),
      __metadata("design:paramtypes", [LoginDto]),
      __metadata("design:returntype", Promise)
    ], AuthController.prototype, "login", null);
    __decorate([
      (0, common_1.Post)("toss"),
      __param(0, (0, common_1.Body)()),
      __metadata("design:type", Function),
      __metadata("design:paramtypes", [TossIdentityDto]),
      __metadata("design:returntype", Promise)
    ], AuthController.prototype, "loginWithTossIdentity", null);
    __decorate([
      (0, common_1.Post)("toss/login"),
      __param(0, (0, common_1.Body)()),
      __metadata("design:type", Function),
      __metadata("design:paramtypes", [TossLoginDto]),
      __metadata("design:returntype", Promise)
    ], AuthController.prototype, "loginWithTossAuthCode", null);
    __decorate([
      (0, common_1.Get)("me"),
      (0, common_1.UseGuards)(auth_guard_1.AuthGuard),
      __param(0, (0, common_1.Request)()),
      __metadata("design:type", Function),
      __metadata("design:paramtypes", [Object]),
      __metadata("design:returntype", Promise)
    ], AuthController.prototype, "me", null);
    exports2.AuthController = AuthController = __decorate([
      (0, common_1.Controller)("auth"),
      (0, common_1.UsePipes)(nestjs_zod_1.ZodValidationPipe),
      __metadata("design:paramtypes", [auth_service_1.AuthService])
    ], AuthController);
  }
});

// apps/api/dist/modules/auth/auth.module.js
var require_auth_module = __commonJS({
  "apps/api/dist/modules/auth/auth.module.js"(exports2) {
    "use strict";
    var __decorate = exports2 && exports2.__decorate || function(decorators, target, key, desc) {
      var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
      if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
      else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
      return c > 3 && r && Object.defineProperty(target, key, r), r;
    };
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.AuthModule = void 0;
    var common_1 = require("@nestjs/common");
    var jwt_1 = require("@nestjs/jwt");
    var database_module_1 = require_database_module();
    var auth_service_1 = require_auth_service();
    var auth_controller_1 = require_auth_controller();
    var auth_guard_1 = require_auth_guard();
    var AuthModule = class AuthModule {
    };
    exports2.AuthModule = AuthModule;
    exports2.AuthModule = AuthModule = __decorate([
      (0, common_1.Module)({
        imports: [
          database_module_1.DatabaseModule,
          jwt_1.JwtModule.register({
            global: true,
            secret: "picky-secret-key-12345!",
            signOptions: { expiresIn: "7d" }
          })
        ],
        controllers: [auth_controller_1.AuthController],
        providers: [auth_service_1.AuthService, auth_guard_1.AuthGuard, auth_guard_1.OptionalAuthGuard],
        exports: [auth_service_1.AuthService, auth_guard_1.AuthGuard, auth_guard_1.OptionalAuthGuard]
      })
    ], AuthModule);
  }
});

// apps/api/dist/modules/poll/poll.service.js
var require_poll_service = __commonJS({
  "apps/api/dist/modules/poll/poll.service.js"(exports2) {
    "use strict";
    var __decorate = exports2 && exports2.__decorate || function(decorators, target, key, desc) {
      var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
      if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
      else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
      return c > 3 && r && Object.defineProperty(target, key, r), r;
    };
    var __metadata = exports2 && exports2.__metadata || function(k, v) {
      if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
    };
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.PollService = void 0;
    var common_1 = require("@nestjs/common");
    var database_service_1 = require_database_service();
    var PollService = class PollService {
      db;
      constructor(db) {
        this.db = db;
      }
      isPollClosed(poll) {
        if (!poll.endsAt) {
          return false;
        }
        const endsAtTime = new Date(poll.endsAt).getTime();
        return Number.isFinite(endsAtTime) && Date.now() >= endsAtTime;
      }
      async generateShortId() {
        const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
        let id = "";
        for (let i = 0; i < 6; i++) {
          id += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        const existed = await this.db.getPollById(id);
        if (existed) {
          return this.generateShortId();
        }
        return id;
      }
      async getPolls() {
        return this.db.getPolls();
      }
      async getPoll(id) {
        const poll = await this.db.getPollById(id);
        if (!poll) {
          throw new common_1.NotFoundException(`\uACE0\uBBFC(\uD22C\uD45C) ID ${id}\uB97C \uCC3E\uC744 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4.`);
        }
        return poll;
      }
      async createPoll(input, creatorId = null, creatorIsGuest = true) {
        const pollId = await this.generateShortId();
        const normalizedEndsAt = input.endsAt || null;
        if (normalizedEndsAt) {
          const endsAtTime = new Date(normalizedEndsAt).getTime();
          if (!Number.isFinite(endsAtTime) || endsAtTime <= Date.now() + 60 * 1e3) {
            throw new common_1.BadRequestException("\uB9C8\uAC10 \uC2DC\uAC04\uC740 \uD604\uC7AC\uBCF4\uB2E4 \uCD5C\uC18C 1\uBD84 \uC774\uD6C4\uB85C \uC124\uC815\uD574\uC57C \uD569\uB2C8\uB2E4.");
          }
        }
        const options = input.options.map((opt, index) => ({
          id: index + 1,
          text: opt.text,
          voteCount: 0,
          imageUrl: opt.imageUrl || null
        }));
        const newPoll = {
          id: pollId,
          question: input.question,
          description: input.description || null,
          options,
          comments: [],
          attachments: input.attachments || [],
          createdAt: (/* @__PURE__ */ new Date()).toISOString(),
          endsAt: normalizedEndsAt,
          totalVotes: 0,
          resultsVisibility: input.resultsVisibility || "afterVote",
          creatorId,
          creatorIsGuest
        };
        await this.db.createPoll(newPoll);
        return newPoll;
      }
      async deletePoll(id, userId) {
        const poll = await this.db.getPollById(id);
        if (!poll) {
          throw new common_1.NotFoundException(`\uACE0\uBBFC(\uD22C\uD45C) ID ${id}\uB97C \uCC3E\uC744 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4.`);
        }
        if (!userId || !poll.creatorId || poll.creatorId !== userId) {
          throw new common_1.ForbiddenException("\uB0B4\uAC00 \uB9CC\uB4E0 \uACE0\uBBFC\uB9CC \uC0AD\uC81C\uD560 \uC218 \uC788\uC2B5\uB2C8\uB2E4.");
        }
        await this.db.deletePoll(id);
        return { id, deleted: true };
      }
      async vote(id, input) {
        const poll = await this.db.getPollById(id);
        if (!poll) {
          throw new common_1.NotFoundException(`\uACE0\uBBFC(\uD22C\uD45C) ID ${id}\uB97C \uCC3E\uC744 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4.`);
        }
        if (this.isPollClosed(poll)) {
          throw new common_1.BadRequestException("\uB9C8\uAC10\uB41C \uD22C\uD45C\uC5D0\uB294 \uB354 \uC774\uC0C1 \uCC38\uC5EC\uD560 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4.");
        }
        const option = poll.options.find((o) => o.id === input.optionId);
        if (!option) {
          throw new common_1.BadRequestException(`\uC62C\uBC14\uB974\uC9C0 \uC54A\uC740 \uC120\uD0DD\uC9C0 ID(${input.optionId})\uC785\uB2C8\uB2E4.`);
        }
        option.voteCount += 1;
        poll.totalVotes += 1;
        if (input.comment && input.comment.trim()) {
          const commentId = poll.comments.length + 1;
          const newComment = {
            id: commentId,
            voterName: input.voterName && input.voterName.trim() ? input.voterName.trim() : "\uC775\uBA85",
            comment: input.comment.trim(),
            createdAt: (/* @__PURE__ */ new Date()).toISOString(),
            selectedOptionId: input.optionId,
            selectedOptionText: option.text
          };
          poll.comments.push(newComment);
        }
        await this.db.updatePoll(poll);
        return poll;
      }
    };
    exports2.PollService = PollService;
    exports2.PollService = PollService = __decorate([
      (0, common_1.Injectable)(),
      __metadata("design:paramtypes", [database_service_1.DatabaseService])
    ], PollService);
  }
});

// apps/api/dist/modules/poll/poll.controller.js
var require_poll_controller = __commonJS({
  "apps/api/dist/modules/poll/poll.controller.js"(exports2) {
    "use strict";
    var __decorate = exports2 && exports2.__decorate || function(decorators, target, key, desc) {
      var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
      if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
      else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
      return c > 3 && r && Object.defineProperty(target, key, r), r;
    };
    var __metadata = exports2 && exports2.__metadata || function(k, v) {
      if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
    };
    var __param = exports2 && exports2.__param || function(paramIndex, decorator) {
      return function(target, key) {
        decorator(target, key, paramIndex);
      };
    };
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.PollController = void 0;
    var common_1 = require("@nestjs/common");
    var nestjs_zod_1 = require("nestjs-zod");
    var shared_1 = require_dist();
    var poll_service_1 = require_poll_service();
    var auth_guard_1 = require_auth_guard();
    var CreatePollDto = class extends (0, nestjs_zod_1.createZodDto)(shared_1.CreatePollSchema) {
    };
    var VoteDto = class extends (0, nestjs_zod_1.createZodDto)(shared_1.VoteSchema) {
    };
    var PollController = class PollController {
      pollService;
      constructor(pollService) {
        this.pollService = pollService;
      }
      getPolls() {
        return this.pollService.getPolls();
      }
      createPoll(req, dto) {
        const user = req.user;
        const creatorId = user?.sub || null;
        const creatorIsGuest = user ? Boolean(user.isGuest) : true;
        return this.pollService.createPoll(dto, creatorId, creatorIsGuest);
      }
      async getPollSharePreview(id, req, res) {
        const poll = await this.pollService.getPoll(id);
        const requestOrigin = this.getRequestOrigin(req);
        const appOrigin = this.getPublicAppOrigin(req);
        const pollUrl = this.resolveSafePollRedirectUrl(req, `${appOrigin}/poll/${encodeURIComponent(poll.id)}`);
        const shareUrl = pollUrl;
        const shareImage = this.resolvePollShareImage(poll, requestOrigin, appOrigin);
        const safeShareUrl = this.escapeHtml(shareUrl);
        const safePollUrl = this.escapeHtml(pollUrl);
        const safeImageUrl = this.escapeHtml(shareImage.url);
        const imageType = this.escapeHtml(shareImage.mimeType);
        const titleText = `${poll.question} | pickflow`;
        const descriptionText = poll.description || "\uACB0\uC815\uC5D0 \uCC38\uC5EC\uD558\uACE0 \uC758\uACAC\uC744 \uB0A8\uACA8\uC8FC\uC138\uC694.";
        const publishedTimeText = poll.createdAt || (/* @__PURE__ */ new Date()).toISOString();
        const updatedTimeText = poll.updatedAt || poll.createdAt || (/* @__PURE__ */ new Date()).toISOString();
        const title = this.escapeHtml(titleText);
        const description = this.escapeHtml(descriptionText);
        const publishedTime = this.escapeHtml(publishedTimeText);
        const updatedTime = this.escapeHtml(updatedTimeText);
        const optionSummaryText = poll.options.slice(0, 4).map((option, index) => `${index + 1}. ${option.text}`).join(" \xB7 ");
        const optionSummary = this.escapeHtml(optionSummaryText);
        const appDomain = this.escapeHtml(new URL(appOrigin).host);
        const structuredData = this.escapeJsonForHtml({
          "@context": "https://schema.org",
          "@type": "WebPage",
          name: titleText,
          description: descriptionText,
          url: shareUrl,
          image: shareImage.url,
          datePublished: publishedTimeText,
          dateModified: updatedTimeText,
          isPartOf: {
            "@type": "WebSite",
            name: "pickflow",
            url: appOrigin
          },
          mainEntity: {
            "@type": "Question",
            name: poll.question,
            text: descriptionText,
            answerCount: poll.options.length,
            suggestedAnswer: poll.options.slice(0, 6).map((option) => ({
              "@type": "Answer",
              text: option.text,
              upvoteCount: option.voteCount
            }))
          }
        });
        res.status(200).set({
          "Cache-Control": "public, max-age=60, s-maxage=300, stale-while-revalidate=86400"
        }).type("text/html").send(`<!doctype html>
<html lang="ko">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${title}</title>
    <meta name="description" content="${description}" />
    <meta name="application-name" content="pickflow" />
    <meta name="robots" content="index, follow" />
    <meta name="theme-color" content="#061411" />
    <meta property="og:type" content="website" />
    <meta property="og:site_name" content="pickflow" />
    <meta property="og:locale" content="ko_KR" />
    <meta property="og:title" content="${title}" />
    <meta property="og:description" content="${description}" />
    <meta property="og:url" content="${safeShareUrl}" />
    <meta property="og:image" content="${safeImageUrl}" />
    <meta property="og:image:url" content="${safeImageUrl}" />
    <meta property="og:image:secure_url" content="${safeImageUrl}" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta property="og:image:type" content="${imageType}" />
    <meta property="og:image:alt" content="${title}" />
    <meta property="al:web:url" content="${safePollUrl}" />
    <meta property="article:published_time" content="${publishedTime}" />
    <meta property="article:modified_time" content="${updatedTime}" />
    <meta property="article:section" content="poll" />
    <meta property="og:updated_time" content="${updatedTime}" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:site" content="@pickflow_io" />
    <meta name="twitter:creator" content="@pickflow_io" />
    <meta name="twitter:domain" content="${appDomain}" />
    <meta name="twitter:url" content="${safeShareUrl}" />
    <meta name="twitter:title" content="${title}" />
    <meta name="twitter:description" content="${description}" />
    <meta name="twitter:image" content="${safeImageUrl}" />
    <meta name="twitter:image:alt" content="${title}" />
    <link rel="canonical" href="${safePollUrl}" />
    <link rel="image_src" href="${safeImageUrl}" />
    <script type="application/ld+json">${structuredData}</script>
    <script>
      window.setTimeout(function () {
        window.location.replace(${JSON.stringify(pollUrl)});
      }, 80);
    </script>
    <style>
      body {
        margin: 0;
        min-height: 100vh;
        display: grid;
        place-items: center;
        background: #061411;
        color: #f4fffc;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      }
      main {
        width: min(92vw, 560px);
        border: 1px solid rgba(255,255,255,.14);
        border-radius: 14px;
        padding: 28px;
        background: #0e211e;
      }
      a { color: #20d6b2; }
      p { color: #b8d6cf; line-height: 1.6; }
      small { color: #7ca59b; }
    </style>
  </head>
  <body>
    <main>
      <small>pickflow poll</small>
      <h1>${title}</h1>
      <p>${description}</p>
      <p>${optionSummary}</p>
      <a href="${safePollUrl}">\uD22C\uD45C \uD654\uBA74\uC73C\uB85C \uC774\uB3D9</a>
    </main>
  </body>
</html>`);
      }
      async getPollOptionImage(id, optionId, req, res) {
        const poll = await this.pollService.getPoll(id);
        const fallbackImageUrl = `${this.getPublicAppOrigin(req)}/og-default.png`;
        const option = poll.options.find((pollOption) => String(pollOption.id) === optionId);
        const imageUrl = option?.imageUrl || "";
        if (!option || !imageUrl) {
          return res.redirect(302, fallbackImageUrl);
        }
        if (imageUrl.startsWith("http://") || imageUrl.startsWith("https://")) {
          return res.redirect(302, imageUrl);
        }
        const dataImage = this.parseDataImage(imageUrl);
        if (!dataImage) {
          return res.redirect(302, fallbackImageUrl);
        }
        return res.status(200).set({
          "Content-Type": dataImage.mimeType,
          "Cache-Control": "public, max-age=31536000, immutable"
        }).send(dataImage.buffer);
      }
      getPoll(id) {
        return this.pollService.getPoll(id);
      }
      vote(id, dto) {
        return this.pollService.vote(id, dto);
      }
      deletePoll(id, req) {
        return this.pollService.deletePoll(id, req.user?.sub ?? null);
      }
      getRequestOrigin(req) {
        const proto = (String(req.headers["x-forwarded-proto"] || req.protocol || "https").split(",")[0] ?? "").trim();
        const host = (String(req.headers["x-forwarded-host"] || req.headers.host || "localhost:5173").split(",")[0] ?? "").trim();
        return `${proto}://${host}`;
      }
      getPublicAppOrigin(req) {
        return this.normalizeOrigin(process.env.PUBLIC_APP_URL || process.env.FRONTEND_URL || process.env.WEB_ORIGIN || process.env.VITE_PUBLIC_APP_URL) || this.getRequestOrigin(req);
      }
      normalizeOrigin(value) {
        const raw = String(value || "").trim().replace(/\/+$/, "");
        if (!raw) {
          return null;
        }
        const withProtocol = raw.startsWith("http://") || raw.startsWith("https://") ? raw : `https://${raw}`;
        try {
          return new URL(withProtocol).origin;
        } catch {
          return null;
        }
      }
      resolveSafePollRedirectUrl(req, fallbackUrl) {
        const rawRedirect = String(req.query?.redirectUrl || req.query?.redirect || "").trim();
        if (!rawRedirect || rawRedirect.length > 2048) {
          return fallbackUrl;
        }
        try {
          const redirectUrl = new URL(rawRedirect);
          const fallback = new URL(fallbackUrl);
          if (redirectUrl.origin !== fallback.origin || !redirectUrl.pathname.startsWith("/poll/")) {
            return fallbackUrl;
          }
          return redirectUrl.href;
        } catch {
          return fallbackUrl;
        }
      }
      resolvePollShareImage(poll, apiOrigin, appOrigin) {
        const defaultImage = {
          url: `${appOrigin}/og-default.png`,
          mimeType: "image/png"
        };
        const firstImageOption = poll.options.find((option) => Boolean(option.imageUrl));
        if (!firstImageOption) {
          return defaultImage;
        }
        const imageUrl = firstImageOption.imageUrl || "";
        if (imageUrl.startsWith("http://") || imageUrl.startsWith("https://")) {
          return {
            url: imageUrl,
            mimeType: this.resolveImageMimeType(imageUrl)
          };
        }
        if (imageUrl.startsWith("data:image/")) {
          return {
            url: `${apiOrigin}/api/polls/${encodeURIComponent(poll.id)}/options/${encodeURIComponent(String(firstImageOption.id))}/image`,
            mimeType: this.resolveDataImageMimeType(imageUrl) || "image/jpeg"
          };
        }
        return defaultImage;
      }
      resolveImageMimeType(value) {
        const pathname = (value.split("?")[0] ?? "").toLowerCase();
        if (pathname.endsWith(".png")) {
          return "image/png";
        }
        if (pathname.endsWith(".webp")) {
          return "image/webp";
        }
        return "image/jpeg";
      }
      resolveDataImageMimeType(value) {
        const match = value.match(/^data:(image\/(?:png|jpe?g|webp));base64,/);
        if (!match) {
          return null;
        }
        return match[1] === "image/jpg" ? "image/jpeg" : match[1] ?? null;
      }
      parseDataImage(value) {
        const match = value.match(/^data:(image\/(?:png|jpe?g|webp));base64,([A-Za-z0-9+/=]+)$/);
        if (!match) {
          return null;
        }
        const mimeType = match[1] === "image/jpg" ? "image/jpeg" : match[1] ?? "image/jpeg";
        const buffer = Buffer.from(match[2] ?? "", "base64");
        if (!buffer.length) {
          return null;
        }
        return { mimeType, buffer };
      }
      escapeJsonForHtml(value) {
        return JSON.stringify(value).replace(/&/g, "\\u0026").replace(/</g, "\\u003c").replace(/>/g, "\\u003e");
      }
      escapeHtml(value) {
        return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
      }
    };
    exports2.PollController = PollController;
    __decorate([
      (0, common_1.Get)(),
      __metadata("design:type", Function),
      __metadata("design:paramtypes", []),
      __metadata("design:returntype", void 0)
    ], PollController.prototype, "getPolls", null);
    __decorate([
      (0, common_1.Post)(),
      (0, common_1.UseGuards)(auth_guard_1.OptionalAuthGuard),
      __param(0, (0, common_1.Request)()),
      __param(1, (0, common_1.Body)()),
      __metadata("design:type", Function),
      __metadata("design:paramtypes", [Object, CreatePollDto]),
      __metadata("design:returntype", void 0)
    ], PollController.prototype, "createPoll", null);
    __decorate([
      (0, common_1.Get)(":id/share"),
      __param(0, (0, common_1.Param)("id")),
      __param(1, (0, common_1.Request)()),
      __param(2, (0, common_1.Res)()),
      __metadata("design:type", Function),
      __metadata("design:paramtypes", [String, Object, Object]),
      __metadata("design:returntype", Promise)
    ], PollController.prototype, "getPollSharePreview", null);
    __decorate([
      (0, common_1.Get)(":id/options/:optionId/image"),
      __param(0, (0, common_1.Param)("id")),
      __param(1, (0, common_1.Param)("optionId")),
      __param(2, (0, common_1.Request)()),
      __param(3, (0, common_1.Res)()),
      __metadata("design:type", Function),
      __metadata("design:paramtypes", [String, String, Object, Object]),
      __metadata("design:returntype", Promise)
    ], PollController.prototype, "getPollOptionImage", null);
    __decorate([
      (0, common_1.Get)(":id"),
      __param(0, (0, common_1.Param)("id")),
      __metadata("design:type", Function),
      __metadata("design:paramtypes", [String]),
      __metadata("design:returntype", void 0)
    ], PollController.prototype, "getPoll", null);
    __decorate([
      (0, common_1.Post)(":id/vote"),
      __param(0, (0, common_1.Param)("id")),
      __param(1, (0, common_1.Body)()),
      __metadata("design:type", Function),
      __metadata("design:paramtypes", [String, VoteDto]),
      __metadata("design:returntype", void 0)
    ], PollController.prototype, "vote", null);
    __decorate([
      (0, common_1.Delete)(":id"),
      (0, common_1.UseGuards)(auth_guard_1.AuthGuard),
      __param(0, (0, common_1.Param)("id")),
      __param(1, (0, common_1.Request)()),
      __metadata("design:type", Function),
      __metadata("design:paramtypes", [String, Object]),
      __metadata("design:returntype", void 0)
    ], PollController.prototype, "deletePoll", null);
    exports2.PollController = PollController = __decorate([
      (0, common_1.Controller)("polls"),
      (0, common_1.UsePipes)(nestjs_zod_1.ZodValidationPipe),
      __metadata("design:paramtypes", [poll_service_1.PollService])
    ], PollController);
  }
});

// apps/api/dist/modules/poll/poll.module.js
var require_poll_module = __commonJS({
  "apps/api/dist/modules/poll/poll.module.js"(exports2) {
    "use strict";
    var __decorate = exports2 && exports2.__decorate || function(decorators, target, key, desc) {
      var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
      if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
      else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
      return c > 3 && r && Object.defineProperty(target, key, r), r;
    };
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.PollModule = void 0;
    var common_1 = require("@nestjs/common");
    var database_module_1 = require_database_module();
    var auth_module_1 = require_auth_module();
    var poll_controller_1 = require_poll_controller();
    var poll_service_1 = require_poll_service();
    var PollModule = class PollModule {
    };
    exports2.PollModule = PollModule;
    exports2.PollModule = PollModule = __decorate([
      (0, common_1.Module)({
        imports: [database_module_1.DatabaseModule, auth_module_1.AuthModule],
        controllers: [poll_controller_1.PollController],
        providers: [poll_service_1.PollService]
      })
    ], PollModule);
  }
});

// apps/api/dist/app.module.js
var require_app_module = __commonJS({
  "apps/api/dist/app.module.js"(exports2) {
    "use strict";
    var __decorate = exports2 && exports2.__decorate || function(decorators, target, key, desc) {
      var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
      if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
      else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
      return c > 3 && r && Object.defineProperty(target, key, r), r;
    };
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.AppModule = void 0;
    var common_1 = require("@nestjs/common");
    var database_module_1 = require_database_module();
    var poll_module_1 = require_poll_module();
    var auth_module_1 = require_auth_module();
    var AppModule = class AppModule {
    };
    exports2.AppModule = AppModule;
    exports2.AppModule = AppModule = __decorate([
      (0, common_1.Module)({
        imports: [database_module_1.DatabaseModule, poll_module_1.PollModule, auth_module_1.AuthModule]
      })
    ], AppModule);
  }
});

// apps/api/dist/main.js
var __importDefault = exports && exports.__importDefault || function(mod) {
  return mod && mod.__esModule ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createApiServer = createApiServer;
var core_1 = require("@nestjs/core");
var app_module_1 = require_app_module();
var helmet_1 = __importDefault(require("helmet"));
var compression_1 = __importDefault(require("compression"));
async function createApiServer() {
  const app = await core_1.NestFactory.create(app_module_1.AppModule);
  app.useBodyParser("json", { limit: "2mb" });
  app.useBodyParser("urlencoded", { extended: true, limit: "2mb" });
  app.enableCors({
    origin: "*",
    methods: ["GET", "HEAD", "PUT", "PATCH", "POST", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "Accept", "Origin", "X-Requested-With"],
    preflightContinue: false,
    optionsSuccessStatus: 204
  });
  app.use((0, helmet_1.default)({ contentSecurityPolicy: false }));
  app.use((0, compression_1.default)());
  app.enableShutdownHooks();
  app.setGlobalPrefix("api");
  const port = process.env.PORT || 3e3;
  console.log(`Picky API starting on http://localhost:${port}/api`);
  await app.init();
  return app;
}
async function bootstrap() {
  const app = await createApiServer();
  const port = process.env.PORT || 3e3;
  await app.listen(port);
}
if (require.main === module) {
  bootstrap();
}
