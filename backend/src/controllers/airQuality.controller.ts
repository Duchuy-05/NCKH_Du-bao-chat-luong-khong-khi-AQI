import { Request, Response, NextFunction } from 'express';
import { mlClientService } from '../services/mlClient.service';
import { AirQualityPrediction } from '../models/entities/AirQualityPrediction.entity';

export class AirQualityController {
  async getDailyForecast(req: Request, res: Response, next: NextFunction): Promise<void> {
    const algo = (req.query.algo as string) || 'svr';
    try {
      const data = await mlClientService.getDailyForecast(algo);

      // Lưu kết quả dự báo vào cơ sở dữ liệu làm lịch sử
      try {
        await AirQualityPrediction.create({
          type: 'daily',
          algo: data.algo,
          city: data.city,
          predictionData: data,
          generatedAt: new Date(data.generated_at),
        });
      } catch (dbErr) {
        console.error('⚠️ [AirQualityController] Không thể lưu lịch sử DB:', dbErr);
      }

      res.status(200).json({
        success: true,
        data,
      });
    } catch (error: any) {
      if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
        res.status(503).json({
          success: false,
          message: 'Dịch vụ AI/ML (ml-service) hiện không phản hồi. Vui lòng kiểm tra lại dịch vụ.',
        });
        return;
      }
      if (error.response) {
        res.status(error.response.status).json({
          success: false,
          message: error.response.data?.detail || 'Lỗi từ ML service',
        });
        return;
      }
      next(error);
    }
  }

  async getHourlyForecast(req: Request, res: Response, next: NextFunction): Promise<void> {
    const algo = (req.query.algo as string) || 'svr';
    try {
      const data = await mlClientService.getHourlyForecast(algo);

      try {
        await AirQualityPrediction.create({
          type: 'hourly',
          algo: data.algo,
          city: data.city,
          predictionData: data,
          generatedAt: new Date(data.generated_at),
        });
      } catch (dbErr) {
        console.error('⚠️ [AirQualityController] Không thể lưu lịch sử DB:', dbErr);
      }

      res.status(200).json({
        success: true,
        data,
      });
    } catch (error: any) {
      if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
        res.status(503).json({
          success: false,
          message: 'Dịch vụ AI/ML (ml-service) hiện không phản hồi. Vui lòng kiểm tra lại dịch vụ.',
        });
        return;
      }
      if (error.response) {
        res.status(error.response.status).json({
          success: false,
          message: error.response.data?.detail || 'Lỗi từ ML service',
        });
        return;
      }
      next(error);
    }
  }

  async healthCheck(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const health = await mlClientService.healthCheck();
      res.status(200).json({
        success: true,
        mlService: health,
      });
    } catch (error: any) {
      res.status(503).json({
        success: false,
        message: 'Không thể kết nối đến ML service',
        error: error.message,
      });
    }
  }
}

export const airQualityController = new AirQualityController();
