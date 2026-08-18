import { Router } from 'express';
import { authController } from '../controllers/auth.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

/**
 * Public routes (no token required)
 */
// POST /api/auth/register  – tạo tài khoản mới
router.post('/register', (req, res, next) => authController.register(req, res, next));

// POST /api/auth/login  – đăng nhập, trả về JWT
router.post('/login', (req, res, next) => authController.login(req, res, next));

/**
 * Protected routes (Bearer token required)
 */
// GET /api/auth/profile  – lấy thông tin tài khoản hiện tại
router.get('/profile', authMiddleware, (req, res, next) => authController.getProfile(req, res, next));

export default router;
