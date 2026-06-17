import { DatabaseService } from '../database/database.service';
import { CreatePollInput, VoteInput, Poll } from '@picky/shared';
export declare class PollService {
    private readonly db;
    constructor(db: DatabaseService);
    private isPollClosed;
    private generateShortId;
    getPolls(): Promise<Poll[]>;
    getPoll(id: string): Promise<Poll>;
    createPoll(input: CreatePollInput, creatorId?: string | null, creatorIsGuest?: boolean): Promise<Poll>;
    vote(id: string, input: VoteInput): Promise<Poll>;
}
