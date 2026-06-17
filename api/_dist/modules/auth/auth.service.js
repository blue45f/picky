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
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const crypto = __importStar(require("crypto"));
const database_service_1 = require("../database/database.service");
let AuthService = class AuthService {
    db;
    jwtService;
    constructor(db, jwtService) {
        this.db = db;
        this.jwtService = jwtService;
    }
    hashPassword(password, salt) {
        return crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
    }
    generateSalt() {
        return crypto.randomBytes(16).toString('hex');
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
            isGuest: user.isGuest,
        };
    }
    async register(input) {
        const normalizedEmail = input.email.trim().toLowerCase();
        const normalizedNickname = input.nickname.trim();
        const existing = await this.db.getUserByEmail(normalizedEmail);
        if (existing) {
            throw new common_1.BadRequestException('이미 등록된 이메일 주소입니다.');
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
            createdAt: new Date().toISOString(),
            isGuest: false,
        };
        await this.db.createUser(newUser);
        const accessToken = await this.signPayload({
            sub: newUser.id,
            email: newUser.email,
            nickname: newUser.nickname,
            isGuest: false,
        });
        return {
            accessToken,
            user: this.toProfile(newUser),
        };
    }
    async registerGuest(input) {
        const normalizedNickname = input.nickname.trim();
        const userId = `guest-${crypto.randomUUID()}`;
        const guestUser = {
            id: userId,
            email: '',
            passwordHash: '',
            salt: '',
            nickname: normalizedNickname,
            createdAt: new Date().toISOString(),
            isGuest: true,
        };
        await this.db.createUser(guestUser);
        const accessToken = await this.signPayload({
            sub: guestUser.id,
            email: guestUser.email,
            nickname: guestUser.nickname,
            isGuest: true,
        });
        return {
            accessToken,
            user: this.toProfile(guestUser),
        };
    }
    async login(input) {
        const normalizedEmail = input.email.trim().toLowerCase();
        const user = await this.db.getUserByEmail(normalizedEmail);
        if (!user || user.isGuest) {
            throw new common_1.UnauthorizedException('이메일 또는 비밀번호가 올바르지 않습니다.');
        }
        const hash = this.hashPassword(input.password, user.salt);
        if (hash !== user.passwordHash) {
            throw new common_1.UnauthorizedException('이메일 또는 비밀번호가 올바르지 않습니다.');
        }
        const accessToken = await this.signPayload({
            sub: user.id,
            email: user.email,
            nickname: user.nickname,
            isGuest: false,
        });
        return {
            accessToken,
            user: this.toProfile(user),
        };
    }
    async validateUser(payload) {
        if (!payload?.sub || typeof payload?.sub !== 'string') {
            throw new common_1.UnauthorizedException('유효하지 않은 사용자입니다.');
        }
        if (payload.isGuest === undefined ||
            typeof payload.nickname !== 'string' ||
            typeof payload.email !== 'string') {
            const user = await this.db.getUserById(payload.sub);
            if (!user) {
                throw new common_1.UnauthorizedException('유효하지 않은 사용자입니다.');
            }
            return this.toProfile(user);
        }
        return {
            id: payload.sub,
            email: payload.email,
            nickname: payload.nickname,
            createdAt: new Date().toISOString(),
            isGuest: payload.isGuest,
        };
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [database_service_1.DatabaseService,
        jwt_1.JwtService])
], AuthService);
//# sourceMappingURL=auth.service.js.map