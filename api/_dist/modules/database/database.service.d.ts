import { OnModuleInit } from '@nestjs/common';
import { Poll } from '@picky/shared';
export interface DatabaseUser {
    id: string;
    email: string;
    passwordHash: string;
    salt: string;
    nickname: string;
    createdAt: string;
    isGuest: boolean;
}
export declare class DatabaseService implements OnModuleInit {
    private readonly storageKey;
    private readonly filePath;
    private readonly storageClient;
    private data;
    private initialized;
    onModuleInit(): Promise<void>;
    private createStorageClient;
    private createSeedData;
    private sanitizeEmails;
    private sanitizeData;
    private loadFromKv;
    private loadFromFile;
    private saveToKv;
    private saveToFile;
    private persist;
    private load;
    private sync;
    private refresh;
    private commit;
    getPolls(): Promise<Poll[]>;
    getPollById(id: string): Promise<Poll | undefined>;
    createPoll(poll: Poll): Promise<void>;
    updatePoll(poll: Poll): Promise<void>;
    getUsers(): Promise<DatabaseUser[]>;
    getUserByEmail(email: string): Promise<DatabaseUser | undefined>;
    getUserById(id: string): Promise<DatabaseUser | undefined>;
    createUser(user: DatabaseUser): Promise<void>;
}
