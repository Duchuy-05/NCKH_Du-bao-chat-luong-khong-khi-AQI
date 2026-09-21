import { Router } from 'express';
import { airQualityController } from '../controllers/airQuality.controller';

const router = Router();

// GET /api/air-quality/predict/daily?algo=svr
router.get('/predict/daily', (req, res, next) => airQualityController.getDailyForecast(req, res, next));

// GET /api/air-quality/predict/hourly?algo=svr
router.get('/predict/hourly', (req, res, next) => airQualityController.getHourlyForecast(req, res, next));

// GET /api/air-quality/health
router.get('/health', (req, res, next) => airQualityController.healthCheck(req, res, next));

export default router;
