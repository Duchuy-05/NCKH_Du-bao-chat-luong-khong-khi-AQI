import { Request, Response, NextFunction } from 'express';
import { healthAdviceService } from '../services/healthAdvice.service';
import { calculateRotation } from '../utils/rotation.util';

export class HealthAdviceController {
  async getHealthAdvice(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const now = Date.now();
      const { secondsRemaining } = calculateRotation(now);
      const data = await healthAdviceService.getHealthAdvice(now);

      const maxAge = Math.min(secondsRemaining, 600);
      res.setHeader('Cache-Control', `public, max-age=${maxAge}`);

      res.status(200).json({
        success: true,
        data,
      });
    } catch (error: any) {
      console.error('❌ [HealthAdviceController] Lỗi lấy khuyến cáo sức khỏe:', error);
      res.status(500).json({
        success: false,
        message: 'Không thể tải dữ liệu khuyến cáo sức khỏe. Vui lòng thử lại sau.',
      });
    }
  }
}

export const healthAdviceController = new HealthAdviceController();
