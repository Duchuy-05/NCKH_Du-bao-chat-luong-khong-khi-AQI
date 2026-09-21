import jwt from 'jsonwebtoken';
import { User, UserRole } from '../models/entities/User.entity';
import { envConfig } from '../config/env.config';

// ── Types ────────────────────────────────────────────────────────────────────

export interface RegisterDto {
  fullName: string;
  email: string;
  password: string;
}

export interface LoginDto {
  email: string;
  password: string;
}

export interface JwtPayload {
  sub: number;   // user id
  email: string;
  role: UserRole;
}

// ── Service ──────────────────────────────────────────────────────────────────

export class AuthService {
  /**
   * Register a new user account.
   * Throws if email already exists.
   */
  async register(dto: RegisterDto): Promise<{ user: object; token: string }> {
    const existing = await User.findOne({ where: { email: dto.email } });
    if (existing) {
      throw new Error('Email đã được sử dụng.');
    }

    // passwordHash stores the plain password at this stage;
    // the BeforeCreate hook in User.entity.ts will hash it automatically.
    const user = await User.create({
      fullName: dto.fullName,
      email: dto.email,
      passwordHash: dto.password,
    });

    const token = this.generateToken(user);
    return { user: user.toSafeObject(), token };
  }

  /**
   * Authenticate an existing user.
   * Throws if credentials are invalid or account inactive.
   */
  async login(dto: LoginDto): Promise<{ user: object; token: string }> {
    const user = await User.findOne({ where: { email: dto.email } });

    if (!user) {
      throw new Error('Email hoặc mật khẩu không đúng.');
    }

    if (!user.isActive) {
      throw new Error('Tài khoản đã bị vô hiệu hoá.');
    }

    const isMatch = await user.comparePassword(dto.password);
    if (!isMatch) {
      throw new Error('Email hoặc mật khẩu không đúng.');
    }

    // Update last login timestamp
    await user.update({ lastLoginAt: new Date() });

    const token = this.generateToken(user);
    return { user: user.toSafeObject(), token };
  }

  /**
   * Return the profile of the authenticated user.
   */
  async getProfile(userId: number): Promise<object> {
    const user = await User.findByPk(userId);
    if (!user) throw new Error('Người dùng không tồn tại.');
    return user.toSafeObject();
  }

  // ── Helpers ──────────────────────────────────────────────────────────────

  private generateToken(user: User): string {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };
    return jwt.sign(payload, envConfig.JWT_SECRET, {
      expiresIn: envConfig.JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'],
    });
  }
}

export const authService = new AuthService();
