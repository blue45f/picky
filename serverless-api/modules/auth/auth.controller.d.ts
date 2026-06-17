import { AuthService } from './auth.service';
declare const RegisterDto_base: import("nestjs-zod").ZodDto<{
    email: string;
    password: string;
    nickname: string;
}, import("zod").ZodEffectsDef<import("zod").ZodEffects<import("zod").ZodObject<{
    email: import("zod").ZodString;
    password: import("zod").ZodString;
    nickname: import("zod").ZodOptional<import("zod").ZodString>;
    name: import("zod").ZodOptional<import("zod").ZodString>;
}, "strip", import("zod").ZodTypeAny, {
    email: string;
    password: string;
    name?: string | undefined;
    nickname?: string | undefined;
}, {
    email: string;
    password: string;
    name?: string | undefined;
    nickname?: string | undefined;
}>, {
    email: string;
    password: string;
    name?: string | undefined;
    nickname?: string | undefined;
}, {
    email: string;
    password: string;
    name?: string | undefined;
    nickname?: string | undefined;
}>>, {
    email: string;
    password: string;
    name?: string | undefined;
    nickname?: string | undefined;
}>;
declare class RegisterDto extends RegisterDto_base {
}
declare const LoginDto_base: import("nestjs-zod").ZodDto<{
    email: string;
    password: string;
}, import("zod").ZodObjectDef<{
    email: import("zod").ZodString;
    password: import("zod").ZodString;
}, "strip", import("zod").ZodTypeAny>, {
    email: string;
    password: string;
}>;
declare class LoginDto extends LoginDto_base {
}
declare const GuestRegisterDto_base: import("nestjs-zod").ZodDto<{
    nickname: string;
}, import("zod").ZodObjectDef<{
    nickname: import("zod").ZodString;
}, "strip", import("zod").ZodTypeAny>, {
    nickname: string;
}>;
declare class GuestRegisterDto extends GuestRegisterDto_base {
}
export declare class AuthController {
    private readonly authService;
    constructor(authService: AuthService);
    register(dto: RegisterDto): Promise<import("@picky/shared").AuthResult>;
    registerGuest(dto: GuestRegisterDto): Promise<import("@picky/shared").AuthResult>;
    login(dto: LoginDto): Promise<import("@picky/shared").AuthResult>;
    me(req: any): Promise<import("@picky/shared").UserProfile>;
}
export {};
