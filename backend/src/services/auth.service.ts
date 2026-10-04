import jwt from 'jsonwebtoken';
import { User, UserRole } from '../models/entities/User.entity';
import { envConfig } from '../config/env.config';

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
  sub: number;
  email: string;
  role: UserRole;
}

export class AuthService {
  async register(dto: RegisterDto): Promise<{ user: object; token: string }> {
    const existing = await User.findOne({ where: { email: dto.email } });
    if (existing) {
      throw new Error('Email đã được sử dụng.');
    }

    const user = User.create({
      fullName: dto.fullName,
      email: dto.email,
      passwordHash: dto.password,
    });
    await user.save();

    const token = this.generateToken(user);
    return { user: user.toSafeObject(), token };
  }

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

    user.lastLoginAt = new Date();
    await user.save();

    const token = this.generateToken(user);
    return { user: user.toSafeObject(), token };
  }

  async getProfile(userId: number): Promise<object> {
    const user = await User.findOne({ where: { id: userId } });
    if (!user) throw new Error('Người dùng không tồn tại.');
    return user.toSafeObject();
  }

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
