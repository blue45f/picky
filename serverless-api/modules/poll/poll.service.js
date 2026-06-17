"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PollService = void 0;
const common_1 = require("@nestjs/common");
const database_service_1 = require("../database/database.service");
let PollService = class PollService {
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
        const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let id = '';
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
            throw new common_1.NotFoundException(`고민(투표) ID ${id}를 찾을 수 없습니다.`);
        }
        return poll;
    }
    async createPoll(input, creatorId = null, creatorIsGuest = true) {
        const pollId = await this.generateShortId();
        const normalizedEndsAt = input.endsAt || null;
        if (normalizedEndsAt) {
            const endsAtTime = new Date(normalizedEndsAt).getTime();
            if (!Number.isFinite(endsAtTime) || endsAtTime <= Date.now() + 60 * 1000) {
                throw new common_1.BadRequestException('마감 시간은 현재보다 최소 1분 이후로 설정해야 합니다.');
            }
        }
        const options = input.options.map((opt, index) => ({
            id: index + 1,
            text: opt.text,
            voteCount: 0,
            imageUrl: opt.imageUrl || null,
        }));
        const newPoll = {
            id: pollId,
            question: input.question,
            description: input.description || null,
            options,
            comments: [],
            attachments: input.attachments || [],
            createdAt: new Date().toISOString(),
            endsAt: normalizedEndsAt,
            totalVotes: 0,
            resultsVisibility: input.resultsVisibility || 'afterVote',
            creatorId,
            creatorIsGuest,
        };
        await this.db.createPoll(newPoll);
        return newPoll;
    }
    async vote(id, input) {
        const poll = await this.db.getPollById(id);
        if (!poll) {
            throw new common_1.NotFoundException(`고민(투표) ID ${id}를 찾을 수 없습니다.`);
        }
        if (this.isPollClosed(poll)) {
            throw new common_1.BadRequestException('마감된 투표에는 더 이상 참여할 수 없습니다.');
        }
        const option = poll.options.find((o) => o.id === input.optionId);
        if (!option) {
            throw new common_1.BadRequestException(`올바르지 않은 선택지 ID(${input.optionId})입니다.`);
        }
        option.voteCount += 1;
        poll.totalVotes += 1;
        if (input.comment && input.comment.trim()) {
            const commentId = poll.comments.length + 1;
            const newComment = {
                id: commentId,
                voterName: input.voterName && input.voterName.trim() ? input.voterName.trim() : '익명',
                comment: input.comment.trim(),
                createdAt: new Date().toISOString(),
                selectedOptionId: input.optionId,
                selectedOptionText: option.text,
            };
            poll.comments.push(newComment);
        }
        await this.db.updatePoll(poll);
        return poll;
    }
};
exports.PollService = PollService;
exports.PollService = PollService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [database_service_1.DatabaseService])
], PollService);
//# sourceMappingURL=poll.service.js.map