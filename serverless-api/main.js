"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createApiServer = createApiServer;
const core_1 = require("@nestjs/core");
const app_module_1 = require("./app.module");
const helmet_1 = __importDefault(require("helmet"));
const compression_1 = __importDefault(require("compression"));
async function createApiServer() {
    const app = await core_1.NestFactory.create(app_module_1.AppModule);
    app.useBodyParser('json', { limit: '2mb' });
    app.useBodyParser('urlencoded', { extended: true, limit: '2mb' });
    app.enableCors({
        origin: '*',
        methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'Origin', 'X-Requested-With'],
        preflightContinue: false,
        optionsSuccessStatus: 204,
    });
    app.use((0, helmet_1.default)({ contentSecurityPolicy: false }));
    app.use((0, compression_1.default)());
    app.enableShutdownHooks();
    app.setGlobalPrefix('api');
    const port = process.env.PORT || 3000;
    console.log(`Picky API starting on http://localhost:${port}/api`);
    await app.init();
    return app;
}
async function bootstrap() {
    const app = await createApiServer();
    const port = process.env.PORT || 3000;
    await app.listen(port);
}
if (require.main === module) {
    bootstrap();
}
//# sourceMappingURL=main.js.map