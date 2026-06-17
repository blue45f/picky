import { JwtService } from '@nestjs/jwt';
import { DatabaseService } from '../database/database.service';
import { RegisterInput, LoginInput, GuestRegisterInput, UserProfile, AuthResult } from '@picky/shared';
export declare class AuthService {
    private readonly db;
    private readonly jwtService;
    constructor(db: DatabaseService, jwtService: JwtService);
    private hashPassword;
    private generateSalt;
    private signPayload;
    private toProfile;
    register(input: RegisterInput): Promise<AuthResult>;
    registerGuest(input: GuestRegisterInput): Promise<AuthResult>;
    login(input: LoginInput): Promise<AuthResult>;
    validateUser(payload: any): Promise<UserProfile>;
}
