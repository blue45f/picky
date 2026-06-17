import { PollService } from './poll.service';
declare const CreatePollDto_base: import("nestjs-zod").ZodDto<{
    options: {
        text: string;
        imageUrl?: string | null | undefined;
    }[];
    question: string;
    description?: string | null | undefined;
    endsAt?: string | null | undefined;
    resultsVisibility?: "afterVote" | "always" | null | undefined;
    attachments?: {
        type: string;
        name: string;
        size: number;
        dataUrl: string;
    }[] | null | undefined;
    categoryId?: string | null | undefined;
}, import("zod").ZodObjectDef<{
    question: import("zod").ZodString;
    description: import("zod").ZodNullable<import("zod").ZodOptional<import("zod").ZodString>>;
    endsAt: import("zod").ZodNullable<import("zod").ZodOptional<import("zod").ZodString>>;
    resultsVisibility: import("zod").ZodNullable<import("zod").ZodOptional<import("zod").ZodEnum<["afterVote", "always"]>>>;
    options: import("zod").ZodArray<import("zod").ZodObject<{
        text: import("zod").ZodString;
        imageUrl: import("zod").ZodNullable<import("zod").ZodOptional<import("zod").ZodString>>;
    }, "strip", import("zod").ZodTypeAny, {
        text: string;
        imageUrl?: string | null | undefined;
    }, {
        text: string;
        imageUrl?: string | null | undefined;
    }>, "many">;
    attachments: import("zod").ZodNullable<import("zod").ZodOptional<import("zod").ZodArray<import("zod").ZodObject<{
        name: import("zod").ZodString;
        type: import("zod").ZodString;
        size: import("zod").ZodNumber;
        dataUrl: import("zod").ZodString;
    }, "strip", import("zod").ZodTypeAny, {
        type: string;
        name: string;
        size: number;
        dataUrl: string;
    }, {
        type: string;
        name: string;
        size: number;
        dataUrl: string;
    }>, "many">>>;
    categoryId: import("zod").ZodNullable<import("zod").ZodOptional<import("zod").ZodString>>;
}, "strip", import("zod").ZodTypeAny>, {
    options: {
        text: string;
        imageUrl?: string | null | undefined;
    }[];
    question: string;
    description?: string | null | undefined;
    endsAt?: string | null | undefined;
    resultsVisibility?: "afterVote" | "always" | null | undefined;
    attachments?: {
        type: string;
        name: string;
        size: number;
        dataUrl: string;
    }[] | null | undefined;
    categoryId?: string | null | undefined;
}>;
declare class CreatePollDto extends CreatePollDto_base {
}
declare const VoteDto_base: import("nestjs-zod").ZodDto<{
    optionId: number;
    voterName?: string | null | undefined;
    comment?: string | null | undefined;
}, import("zod").ZodObjectDef<{
    optionId: import("zod").ZodNumber;
    voterName: import("zod").ZodNullable<import("zod").ZodOptional<import("zod").ZodString>>;
    comment: import("zod").ZodNullable<import("zod").ZodOptional<import("zod").ZodString>>;
}, "strip", import("zod").ZodTypeAny>, {
    optionId: number;
    voterName?: string | null | undefined;
    comment?: string | null | undefined;
}>;
declare class VoteDto extends VoteDto_base {
}
export declare class PollController {
    private readonly pollService;
    constructor(pollService: PollService);
    getPolls(): Promise<import("@picky/shared").Poll[]>;
    createPoll(req: any, dto: CreatePollDto): Promise<import("@picky/shared").Poll>;
    getPollSharePreview(id: string, req: any, res: any): Promise<void>;
    getPollOptionImage(id: string, optionId: string, req: any, res: any): Promise<any>;
    getPoll(id: string): Promise<import("@picky/shared").Poll>;
    vote(id: string, dto: VoteDto): Promise<import("@picky/shared").Poll>;
    private getRequestOrigin;
    private getPublicAppOrigin;
    private normalizeOrigin;
    private resolveSafePollRedirectUrl;
    private resolvePollShareImage;
    private resolveImageMimeType;
    private resolveDataImageMimeType;
    private parseDataImage;
    private escapeJsonForHtml;
    private escapeHtml;
}
export {};
