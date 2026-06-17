import { NestExpressApplication } from '@nestjs/platform-express';
export declare function createApiServer(): Promise<NestExpressApplication<import("node:http").Server<typeof import("node:http").IncomingMessage, typeof import("node:http").ServerResponse>>>;
