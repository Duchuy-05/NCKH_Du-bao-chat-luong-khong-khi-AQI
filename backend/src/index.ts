import 'reflect-metadata';
import express from 'express';
import cors from 'cors';
import { envConfig } from './config/env.config';
import { connectDatabase } from './config/database.config';
import authRouter from './routers/auth.router';
import airQualityRouter from './routers/airQuality.router';

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Root health check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', service: 'backend', timestamp: new Date().toISOString() });
});

// Mount các router
app.use('/api/auth', authRouter);
app.use('/api/air-quality', airQualityRouter);

// Middleware xử lý lỗi tập trung (Error Handler)
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('[Unhandled Server Error]:', err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Lỗi máy chủ nội bộ',
  });
});

async function startServer() {
  try {
    // 1. Kết nối PostgreSQL database
    await connectDatabase();

    // 2. Lắng nghe cổng
    const PORT = envConfig.PORT || 3000;
    app.listen(PORT, () => {
      console.log(`Backend server đang lắng nghe tại: http://localhost:${PORT}`);
      console.log(`URL kết nối ML Service: ${envConfig.ML_SERVICE_URL}`);
    });
  } catch (error) {
    console.error('Khởi động server thất bại:', error);
    process.exit(1);
  }
}

startServer();
