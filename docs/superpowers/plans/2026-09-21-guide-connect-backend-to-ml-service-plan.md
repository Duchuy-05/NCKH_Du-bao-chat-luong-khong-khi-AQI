# Hướng dẫn chi tiết cài đặt & kết nối Backend (Express) với ML-Service (FastAPI/SVR)

> **Ngày lập:** 21/09/2026  
> **Dự án:** Dự báo chỉ số chất lượng không khí (AQI) — Hoàn Kiếm, Hà Nội (`NCKH_Du-bao-chat-luong-khong-khi-AQI`)  
> **Tài liệu tham khảo gốc:** [`docs/superpowers/docs/HUONG_DAN.md`](file:///C:/.Study%20at%20Home/.NCKH/NCKH/docs/superpowers/docs/HUONG_DAN.md)

---

## 1. Tổng quan kiến trúc & Luồng dữ liệu

```
[ Frontend / Client ]
        │
        ▼ (HTTP REST)
┌────────────────────────────────────────────────────────────────────────┐
│  Backend (Express + TypeScript - Port 3000)                           │
│  - Router: /api/air-quality/predict/daily & hourly                     │
│  - Controller: airQuality.controller.ts                                │
│  - Service: mlClient.service.ts (Axios + X-Internal-Api-Key)           │
│  - Model: AirQualityPrediction.entity.ts (Sequelize lưu lịch sử DB)    │
└──────────────────────────────────┬─────────────────────────────────────┘
                                   │ (HTTP REST nội bộ + Header Auth)
                                   ▼
┌────────────────────────────────────────────────────────────────────────┐
│  ML Service (FastAPI + Python - Port 8000)                             │
│  - GET /health                                                         │
│  - GET /forecast/daily?algo=svr  (Dự báo 7 ngày, 1 điểm/ngày)         │
│  - GET /forecast/hourly?algo=svr (Dự báo 24h, bước 3h = 8 bước nhảy)   │
│  - Middleware/Dependency: verify_internal_key                          │
│  - SVR Models: models/*.joblib                                         │
└──────────────────────────────────┬─────────────────────────────────────┘
                                   │
                                   ▼
┌────────────────────────────────────────────────────────────────────────┐
│  PostgreSQL Database (Port 5432)                                       │
│  - Table: `users`                                                      │
│  - Table: `air_quality_predictions` (tự động tạo qua Sequelize sync)   │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Danh sách các vấn đề hiện tại cần xử lý

1. **Backend thiếu file thực thi chính:** Chưa có file `backend/src/index.ts` để kết nối DB và lắng nghe request.
2. **Các file tích hợp ML ở Backend chỉ là placeholder (chưa có code):**
   - `backend/src/config/mlService.config.ts`
   - `backend/src/services/mlClient.service.ts`
   - `backend/src/models/entities/AirQualityPrediction.entity.ts`
   - `backend/src/controllers/airQuality.controller.ts`
   - `backend/src/routers/airQuality.router.ts`
3. **Database Config:** `backend/src/config/database.config.ts` chưa đăng ký model `AirQualityPrediction`.
4. **Lỗi chính tả đường dẫn import:** `backend/src/routers/auth.router.ts` đang import từ `../middleware/...` (thiếu `s`), trong khi thư mục thật là `../middlewares/...`.
5. **Backend dependencies:** `backend/package.json` chưa khai báo các thư viện cần thiết (`axios`, `express`, `sequelize`, `pg`, ...).
6. **Bảo mật nội bộ (Internal Auth):** `ml-service` chưa kiểm tra API key nội bộ để ngăn truy cập trái phép trực tiếp vào cổng 8000.

---

## 3. Các bước triển khai chi tiết

### Bước 1: Cài đặt Dependencies cho Backend

Mở terminal tại thư mục `backend/` và chạy lệnh cài đặt:

```bash
cd backend

# Cài đặt runtime dependencies
npm i express cors dotenv axios sequelize sequelize-typescript pg pg-hstore jsonwebtoken bcryptjs

# Cài đặt development & type definitions
npm i -D typescript ts-node nodemon @types/express @types/node @types/cors @types/jsonwebtoken @types/bcryptjs
```

---

### Bước 2: Tạo cấu hình kết nối ML Service (`backend/src/config/mlService.config.ts`)

Ghi đè nội dung file [backend/src/config/mlService.config.ts](file:///C:/.Study%20at%20Home/.NCKH/NCKH/backend/src/config/mlService.config.ts):

```typescript
import { envConfig } from './env.config';

export const mlServiceConfig = {
  baseUrl: envConfig.ML_SERVICE_URL || 'http://localhost:8000',
  internalApiKey: envConfig.ML_INTERNAL_API_KEY || '',
  timeoutMs: 15000, // Timeout 15 giây phòng trường hợp model chạy lâu
};
```

---

### Bước 3: Tạo Entity lưu lịch sử dự đoán (`backend/src/models/entities/AirQualityPrediction.entity.ts`)

Tạo model Sequelize quản lý bảng `air_quality_predictions`:

```typescript
import {
  Table,
  Column,
  Model,
  DataType,
  CreatedAt,
  UpdatedAt,
  AllowNull,
  Default,
} from 'sequelize-typescript';

@Table({
  tableName: 'air_quality_predictions',
  timestamps: true,
  underscored: true,
})
export class AirQualityPrediction extends Model {
  @Column({
    type: DataType.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  })
  declare id: number;

  @AllowNull(false)
  @Column({
    type: DataType.STRING(20),
    comment: 'Loại dự báo: daily hoặc hourly',
  })
  declare type: string;

  @AllowNull(false)
  @Default('svr')
  @Column({
    type: DataType.STRING(50),
    comment: 'Thuật toán sử dụng: svr',
  })
  declare algo: string;

  @AllowNull(false)
  @Default('hanoi')
  @Column({
    type: DataType.STRING(100),
    comment: 'Thành phố hoặc trạm đo',
  })
  declare city: string;

  @AllowNull(false)
  @Column({
    type: DataType.JSONB,
    field: 'prediction_data',
    comment: 'Toàn bộ dữ liệu dự báo trả về từ ml-service',
  })
  declare predictionData: object;

  @AllowNull(false)
  @Column({
    type: DataType.DATE,
    field: 'generated_at',
    comment: 'Thời điểm ml-service khởi tạo kết quả',
  })
  declare generatedAt: Date;

  @CreatedAt
  @Column({ field: 'created_at' })
  declare createdAt: Date;

  @UpdatedAt
  @Column({ field: 'updated_at' })
  declare updatedAt: Date;
}
```

---

### Bước 4: Đăng ký Entity vào Database Config (`backend/src/config/database.config.ts`)

Mở file [backend/src/config/database.config.ts](file:///C:/.Study%20at%20Home/.NCKH/NCKH/backend/src/config/database.config.ts) và thêm `AirQualityPrediction` vào mảng `models`:

```typescript
import { Sequelize } from 'sequelize-typescript';
import { envConfig } from './env.config';
import { User } from '../models/entities/User.entity';
import { AirQualityPrediction } from '../models/entities/AirQualityPrediction.entity';

export const sequelize = new Sequelize({
  dialect: 'postgres',
  host: envConfig.DB_HOST,
  port: envConfig.DB_PORT,
  database: envConfig.DB_NAME,
  username: envConfig.DB_USER,
  password: envConfig.DB_PASSWORD,
  logging: false,
  models: [
    User,
    AirQualityPrediction, // <-- Thêm entity này vào
  ],
  define: {
    underscored: true,
    timestamps: true,
  },
});

export async function connectDatabase(): Promise<void> {
  await sequelize.authenticate();
  console.log('✅ Database connection established.');

  if (envConfig.NODE_ENV !== 'production') {
    await sequelize.sync({ alter: true });
    console.log('✅ Database schema synchronised (alter mode).');
  }
}
```

---

### Bước 5: Tạo Service giao tiếp HTTP (`backend/src/services/mlClient.service.ts`)

Tạo service dùng `axios` kết nối tới các endpoint của `ml-service`:

```typescript
import axios, { AxiosInstance } from 'axios';
import { mlServiceConfig } from '../config/mlService.config';

export interface DailyForecastPoint {
  date: string;
  aqi: number;
  level?: string;
}

export interface DailyForecastResponse {
  city: string;
  algo: string;
  generated_at: string;
  horizon_days: number;
  forecast: DailyForecastPoint[];
}

export interface HourlyForecastPoint {
  timestamp: string;
  aqi: number;
  level?: string;
}

export interface HourlyForecastResponse {
  city: string;
  algo: string;
  generated_at: string;
  horizon_steps: number;
  step_hours: number;
  forecast: HourlyForecastPoint[];
}

export class MLClientService {
  private client: AxiosInstance;

  constructor() {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (mlServiceConfig.internalApiKey) {
      headers['X-Internal-Api-Key'] = mlServiceConfig.internalApiKey;
    }

    this.client = axios.create({
      baseURL: mlServiceConfig.baseUrl,
      headers,
      timeout: mlServiceConfig.timeoutMs,
    });
  }

  /**
   * Kiểm tra trạng thái hoạt động của ML-service
   */
  async healthCheck(): Promise<{ status: string; service: string; algo: string }> {
    const response = await this.client.get('/health');
    return response.data;
  }

  /**
   * Lấy dự báo AQI 7 ngày tới
   */
  async getDailyForecast(algo = 'svr'): Promise<DailyForecastResponse> {
    const response = await this.client.get<DailyForecastResponse>('/forecast/daily', {
      params: { algo },
    });
    return response.data;
  }

  /**
   * Lấy dự báo AQI 24h tới (bước 3h)
   */
  async getHourlyForecast(algo = 'svr'): Promise<HourlyForecastResponse> {
    const response = await this.client.get<HourlyForecastResponse>('/forecast/hourly', {
      params: { algo },
    });
    return response.data;
  }
}

export const mlClientService = new MLClientService();
```

---

### Bước 6: Tạo Controller xử lý logic & bắt lỗi (`backend/src/controllers/airQuality.controller.ts`)

Ghi đè file [backend/src/controllers/airQuality.controller.ts](file:///C:/.Study%20at%20Home/.NCKH/NCKH/backend/src/controllers/airQuality.controller.ts):

```typescript
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
```

---

### Bước 7: Cập nhật Router (`backend/src/routers/airQuality.router.ts`)

Ghi đè file [backend/src/routers/airQuality.router.ts](file:///C:/.Study%20at%20Home/.NCKH/NCKH/backend/src/routers/airQuality.router.ts):

```typescript
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
```

---

### Bước 8: Sửa lỗi Import trong `backend/src/routers/auth.router.ts`

Trong file [backend/src/routers/auth.router.ts](file:///C:/.Study%20at%20Home/.NCKH/NCKH/backend/src/routers/auth.router.ts#L3), sửa đường dẫn `../middleware/...` thành `../middlewares/...`:

```typescript
// Sửa dòng 3:
import { authMiddleware } from '../middlewares/auth.middleware';
```

---

### Bước 9: Tạo file khởi động Backend Server (`backend/src/index.ts`)

Tạo mới file `backend/src/index.ts`:

```typescript
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
  console.error('❌ [Unhandled Server Error]:', err);
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
      console.log(`🚀 Backend server đang lắng nghe tại: http://localhost:${PORT}`);
      console.log(`📡 URL kết nối ML Service: ${envConfig.ML_SERVICE_URL}`);
    });
  } catch (error) {
    console.error('❌ Khởi động server thất bại:', error);
    process.exit(1);
  }
}

startServer();
```

---

### Bước 10: Thêm xác thực nội bộ cho ML Service (`ml-service/app/main.py`)

Để đảm bảo an toàn, thêm kiểm tra header `X-Internal-Api-Key` cho các endpoint dự báo tại file [ml-service/app/main.py](file:///C:/.Study%20at%20Home/.NCKH/NCKH/ml-service/app/main.py):

1. **Thêm import và hàm kiểm tra:**
```python
import os
from typing import Optional
from fastapi import FastAPI, HTTPException, Query, Header, Depends

INTERNAL_API_KEY = os.getenv("INTERNAL_API_KEY", "")

def verify_internal_key(x_internal_api_key: Optional[str] = Header(None)):
    """Kiểm tra API Key nội bộ giữa Backend và ML Service."""
    if INTERNAL_API_KEY:
        if not x_internal_api_key or x_internal_api_key != INTERNAL_API_KEY:
            raise HTTPException(
                status_code=401,
                detail="Unauthorized: Khóa xác thực nội bộ (X-Internal-Api-Key) không đúng hoặc bị thiếu."
            )
```

2. **Gắn dependency vào các route dự báo (giữ `/health` mở tự do):**
```python
@app.get(
    "/forecast/daily", 
    response_model=DailyForecastResponse, 
    tags=["Forecast"],
    dependencies=[Depends(verify_internal_key)] # <-- Thêm dòng này
)
def forecast_daily(algo: str = Query("svr", description="Thuật toán dự báo (mặc định: svr)")):
    ...

@app.get(
    "/forecast/hourly", 
    response_model=HourlyForecastResponse, 
    tags=["Forecast"],
    dependencies=[Depends(verify_internal_key)] # <-- Thêm dòng này
)
def forecast_hourly(algo: str = Query("svr", description="Thuật toán dự báo (mặc định: svr)")):
    ...
```

---

## 4. Cấu hình file môi trường (`.env`) mẫu

### File `backend/.env`
```ini
NODE_ENV=development
PORT=3000

# PostgreSQL
DB_HOST=localhost
DB_PORT=5432
DB_NAME=airvision_db
DB_USER=postgres
DB_PASSWORD=postgres

# Auth
JWT_SECRET=super_secret_jwt_key_2026
JWT_EXPIRES_IN=7d

# ML Service
ML_SERVICE_URL=http://localhost:8000
ML_INTERNAL_API_KEY=airvision_internal_secret_2026
```

### File `ml-service/.env`
```ini
INTERNAL_API_KEY=airvision_internal_secret_2026
```

*(Lưu ý: Giá trị `ML_INTERNAL_API_KEY` ở backend phải trùng khớp với `INTERNAL_API_KEY` ở ml-service).*

---

## 5. Hướng dẫn chạy thử và kiểm tra luồng (Verification)

Mở 2 cửa sổ terminal riêng biệt:

### Cửa sổ 1: Khởi động ML Service
```bash
cd ml-service
# Kích hoạt venv (nếu có)
# .venv\Scripts\activate  (trên Windows)
uvicorn app.main:app --reload --port 8000
```
Kiểm tra sức khỏe:
```bash
curl http://localhost:8000/health
# Kết quả mong đợi: {"status":"ok","service":"airvision-ml-service","algo":"SVR"}
```

### Cửa sổ 2: Khởi động Backend
```bash
cd backend
npm run dev
```
Thông báo trên console:
```text
✅ Database connection established.
✅ Database schema synchronised (alter mode).
🚀 Backend server đang lắng nghe tại: http://localhost:3000
📡 URL kết nối ML Service: http://localhost:8000
```

### Cửa sổ 3: Test API Backend gọi qua ML Service
```bash
# 1. Test kết nối thông qua Backend
curl http://localhost:3000/api/air-quality/health

# 2. Test dự báo 7 ngày tới (Daily)
curl "http://localhost:3000/api/air-quality/predict/daily?algo=svr"

# 3. Test dự báo 24h tới (Hourly)
curl "http://localhost:3000/api/air-quality/predict/hourly?algo=svr"
```

---

## 6. Bảng tra cứu lỗi thường gặp (Troubleshooting)

| STT | Hiện tượng lỗi | Nguyên nhân gốc rễ | Cách xử lý |
| :---: | :--- | :--- | :--- |
| **1** | Backend trả `503 Service Unavailable` | `ml-service` chưa bật hoặc sai port `ML_SERVICE_URL` | Kiểm tra terminal của `ml-service`, đảm bảo đang chạy tại cổng `8000`. |
| **2** | `ml-service` trả `401 Unauthorized` | Key xác thực không khớp giữa 2 service | Kiểm tra `ML_INTERNAL_API_KEY` trong `backend/.env` và `INTERNAL_API_KEY` trong `ml-service/.env`. |
| **3** | TypeScript báo lỗi: `Cannot find module '../middleware/auth.middleware'` | Sai tên thư mục trong import (`middleware` thay vì `middlewares`) | Sửa lại import tại [backend/src/routers/auth.router.ts](file:///C:/.Study%20at%20Home/.NCKH/NCKH/backend/src/routers/auth.router.ts#L3) thành `../middlewares/auth.middleware`. |
| **4** | Lỗi Sequelize `column type jsonb not supported` | Sử dụng sai hệ quản trị CSDL (ví dụ MySQL) | PostgreSQL hỗ trợ native `JSONB`. Đảm bảo `dialect: 'postgres'` trong [database.config.ts](file:///C:/.Study%20at%20Home/.NCKH/NCKH/backend/src/config/database.config.ts). |
| **5** | Gọi API trả về `500 Lỗi dự báo Daily: No model found` | Chưa có file model `.joblib` đã huấn luyện | Kiểm tra thư mục `ml-service/models/`, đảm bảo đã có file model SVR huấn luyện sẵn. |
