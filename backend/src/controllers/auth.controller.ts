import { Request, Response, NextFunction } from 'express';
import { authService } from '../services/auth.service';

export class AuthController {
  /**
   * POST /api/auth/register
   * Body: { fullName, email, password }
   */
  async register(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { fullName, email, password } = req.body;

      if (!fullName || !email || !password) {
        res.status(400).json({ success: false, message: 'Vui lòng điền đầy đủ thông tin.' });
        return;
      }

      if (password.length < 6) {
        res.status(400).json({ success: false, message: 'Mật khẩu phải có ít nhất 6 ký tự.' });
        return;
      }

      const result = await authService.register({ fullName, email, password });
      res.status(201).json({ success: true, message: 'Đăng ký thành công.', data: result });
    } catch (error: any) {
      next(error);
    }
  }

  /**
   * POST /api/auth/login
   * Body: { email, password }
   */
  async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        res.status(400).json({ success: false, message: 'Vui lòng nhập email và mật khẩu.' });
        return;
      }

      const result = await authService.login({ email, password });
      res.status(200).json({ success: true, message: 'Đăng nhập thành công.', data: result });
    } catch (error: any) {
      next(error);
    }
  }

  /**
   * GET /api/auth/profile
   * Header: Authorization: Bearer <token>
   * (req.user is set by the auth middleware)
   */
  async getProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as any).user?.sub;
      if (!userId) {
        res.status(401).json({ success: false, message: 'Chưa xác thực.' });
        return;
      }

      const user = await authService.getProfile(userId);
      res.status(200).json({ success: true, data: user });
    } catch (error: any) {
      next(error);
    }
  }
}

export const authController = new AuthController();
