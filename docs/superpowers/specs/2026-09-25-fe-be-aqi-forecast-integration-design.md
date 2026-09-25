# Thiết kế Kỹ thuật (Spec): Kết nối Frontend ↔ Backend — Module Dự báo AQI

**Tài liệu:** `docs/superpowers/specs/2026-09-25-fe-be-aqi-forecast-integration-design.md`  
**Ngày tạo:** 2026-09-25  
**Trạng thái:** Chờ duyệt (Pending Review)  
**Phạm vi:** Tích hợp `frontend/src/pages/Forecast.tsx` và `frontend/src/services/apiClient/airquality.api.ts` với các API thật của `backend` (đã hoàn tất nối `backend ↔ ml-service`).

---

## 1. Mục tiêu & Bối cảnh

### 1.1. Hiện trạng
- **Backend:** Đã có controller `airQuality.controller.ts`, router `airQuality.router.ts`, và service `mlClient.service.ts` gọi sang `ml-service` (FastAPI). Kết quả dự báo được tự động lưu vào bảng `AirQualityPrediction` trong PostgreSQL.
- **Frontend:** Trang `Forecast.tsx` hiện đang dùng dữ liệu mock cứng từ `frontend/src/data/mockAirData.ts` (`SEVEN_DAY_FORECAST`, `HOURLY_AQI_DATA_24H`). File client `frontend/src/services/apiClient/airquality.api.ts` mới chỉ là placeholder trống.
- **Tính chất NCKH:** Đề tài nghiên cứu khoa học yêu cầu tính trung thực của dữ liệu AI. Không được tạo số liệu giả (mock/fake) khi hiển thị kết quả từ mô hình học máy.

### 1.2. Mục tiêu kỹ thuật
1. Chuẩn hóa API client phía FE (`airquality.api.ts`) với kiểu dữ liệu TypeScript chặt chẽ, xử lý timeout và unwrap envelope response.
2. Xây dựng tầng Hook quản lý trạng thái (`useAirQualityForecast`) tách biệt logic gọi API, loading, error, retry khỏi component UI.
3. Giải quyết **Data Gap** (khoảng trống dữ liệu giữa mock cũ và dữ liệu ML thật) một cách khoa học: tối giản type, chỉ hiển thị dữ liệu AI thực tế, ẩn các thông số thời tiết chưa có mô hình dự báo.
4. Xử lý kịch bản lỗi chân thực (đặc biệt mã HTTP 503 khi ML service bận hoặc ngừng hoạt động) với giao diện fallback và nút Retry.
5. Xử lý giới hạn phạm vi mô hình (mô hình AI hiện tại được huấn luyện trên trạm Hà Nội: `city = 'hanoi'`).

---

## 2. Đặc tả API Contract (Backend ↔ Frontend)

### 2.1. Cấu hình Base URL & Môi trường

| Môi trường | Giá trị Base URL | Ghi chú |
|---|---|---|
| **Local Dev** | `http://localhost:3000/api` | Trình duyệt gọi trực tiếp tới cổng backend |
| **Docker Compose** | `http://localhost:3000/api` (FE trên browser) | Client FE chạy trên máy người dùng, không dùng alias docker `backend:3000` |
| **Production** | `https://api.<domain>.vn/api` | Cấu hình qua biến môi trường build-time |

Biến môi trường Frontend trong `frontend/.env`:
```bash
VITE_API_BASE_URL=http://localhost:3000/api
```
*(Đã có `frontend/.env.example` làm mẫu).*

> **Lưu ý bảo mật & Auth:** Backend hiện **không yêu cầu JWT** cho các route `/api/air-quality/*` (router không gắn `auth.middleware`). Frontend gọi trực tiếp không cần header `Authorization`.

---

### 2.2. Chi tiết các Endpoints

#### 2.2.1. Dự báo AQI 7 ngày (`GET /api/air-quality/predict/daily`)
- **Query Params:**
  - `algo` *(string, optional)*: thuật toán dự báo (mặc định: `svr`).
- **Response thành công (HTTP 200):**
  ```json
  {
    "success": true,
    "data": {
      "city": "hanoi",
      "algo": "svr",
      "generated_at": "2026-09-25T07:00:00Z",
      "horizon_days": 7,
      "forecast": [
        { "date": "2026-09-26", "aqi": 132.4, "level": "unhealthy_sensitive" },
        { "date": "2026-09-27", "aqi": 118.9, "level": "unhealthy_sensitive" },
        { "date": "2026-09-28", "aqi": 95.0,  "level": "moderate" },
        { "date": "2026-09-29", "aqi": 88.3,  "level": "moderate" },
        { "date": "2026-09-30", "aqi": 105.1, "level": "unhealthy_sensitive" },
        { "date": "2026-10-01", "aqi": 142.7, "level": "unhealthy_sensitive" },
        { "date": "2026-10-02", "aqi": 120.5, "level": "unhealthy_sensitive" }
      ]
    }
  }
  ```
  - Mảng `forecast` có đúng 7 phần tử, theo thứ tự ngày tăng dần.
  - `level` có thể `null` hoặc chuỗi enum: `'good' | 'moderate' | 'unhealthy_sensitive' | 'unhealthy' | 'very_unhealthy' | 'hazardous'`. Nếu `null`, FE sử dụng hàm tiện ích `getAQICategory(aqi)` để tự suy ra cấp độ.

- **Response lỗi ML Service ngừng hoạt động (HTTP 503):**
  ```json
  {
    "success": false,
    "message": "Dịch vụ AI/ML (ml-service) hiện không phản hồi. Vui lòng kiểm tra lại dịch vụ."
  }
  ```

---

#### 2.2.2. Dự báo AQI 24 giờ tiếp theo (`GET /api/air-quality/predict/hourly`)
- **Query Params:**
  - `algo` *(string, optional)*: thuật toán dự báo (mặc định: `svr`).
- **Response thành công (HTTP 200):**
  ```json
  {
    "success": true,
    "data": {
      "city": "hanoi",
      "algo": "svr",
      "generated_at": "2026-09-25T07:00:00Z",
      "horizon_steps": 8,
      "step_hours": 3,
      "forecast": [
        { "timestamp": "2026-09-25T10:00:00Z", "aqi": 145.2, "level": "unhealthy_sensitive" },
        { "timestamp": "2026-09-25T13:00:00Z", "aqi": 138.0, "level": "unhealthy_sensitive" },
        { "timestamp": "2026-09-25T16:00:00Z", "aqi": 125.6, "level": "unhealthy_sensitive" },
        { "timestamp": "2026-09-25T19:00:00Z", "aqi": 110.4, "level": "unhealthy_sensitive" },
        { "timestamp": "2026-09-25T22:00:00Z", "aqi": 98.7,  "level": "moderate" },
        { "timestamp": "2026-09-26T01:00:00Z", "aqi": 92.1,  "level": "moderate" },
        { "timestamp": "2026-09-26T04:00:00Z", "aqi": 105.3, "level": "unhealthy_sensitive" },
        { "timestamp": "2026-09-26T07:00:00Z", "aqi": 128.9, "level": "unhealthy_sensitive" }
      ]
    }
  }
  ```
  - Mảng `forecast` có 8 mốc dự báo, mỗi mốc cách nhau 3 giờ (tổng 24 giờ tới).

---

#### 2.2.3. Kiểm tra trạng thái AI Service (`GET /api/air-quality/health`)
- **Response thành công (HTTP 200):**
  ```json
  {
    "success": true,
    "mlService": {
      "status": "ok",
      "service": "ml-service",
      "algo": "svr"
    }
  }
  ```
- **Response lỗi (HTTP 503):**
  ```json
  {
    "success": false,
    "message": "Không thể kết nối đến ML service",
    "error": "connect ECONNREFUSED 127.0.0.1:8000"
  }
  ```

---

## 3. Phân tích Khoảng trống Dữ liệu (Data Gap) & Quyết định Thiết kế

### 3.1. So sánh chi tiết Mock vs Dữ liệu thực

| Trường dữ liệu trên Mock UI cũ | Có trong ML Service thật không? | Giải pháp xử lý |
|---|---|---|
| `aqi`, `date` / `timestamp` | ✅ **Có** | Sử dụng trực tiếp từ API |
| `level` (mức AQI) | ⚠️ **Có nhưng có thể null** | Dùng giá trị BE trả về; nếu `null` thì fallback sang `getAQICategory(aqi).level` |
| `dayOfWeekVi`, `dayOfWeekEn` | ❌ **Không** | Tính toán tự động ở FE từ trường `date` (hàm helper `getDayOfWeek(date)`) |
| `minTemp`, `maxTemp`, `condition`, `rainProbability` | ❌ **Không** (ML hiện tại chỉ dự báo AQI) | **Ẩn hoặc hiển thị trạng thái N/A**. Tuyệt đối không sinh số ngẫu nhiên. Biểu đồ 7 ngày chuyển sang chế độ tập trung vào đường AQI. |
| `pm25`, `pm10`, `humidity`, `temperature` trong thẻ 24h | ❌ **Không** | Bỏ dòng thông số phụ ở chân thẻ 24h, tập trung vào mốc giờ + chỉ số AQI + badge mức độ. |
| Danh sách thành phố | ⚠️ **Chỉ có Hà Nội** | Thêm nhãn cảnh báo/thông báo khi chọn thành phố khác: *"Mô hình AI hiện tại đang phục vụ trạm quan trắc Hà Nội"*. |

### 3.2. Cấu trúc Type mới (Độc lập & Tinh gọn)

Thêm vào `frontend/src/types/airQuality.types.ts`:

```typescript
// Điểm dự báo ngày thực tế từ ML
export interface RealDailyForecastPoint {
  date: string;       // Định dạng 'YYYY-MM-DD'
  aqi: number;        // Ví dụ: 132.4
  level?: AQILevel | null;
}

// Metadata gói dự báo ngày
export interface DailyForecastResponseData {
  city: string;
  algo: string;
  generated_at: string;
  horizon_days: number;
  forecast: RealDailyForecastPoint[];
}

// Điểm dự báo giờ thực tế từ ML
export interface RealHourlyForecastPoint {
  timestamp: string;  // Định dạng ISO '2026-09-25T10:00:00Z'
  aqi: number;
  level?: AQILevel | null;
}

// Metadata gói dự báo giờ
export interface HourlyForecastResponseData {
  city: string;
  algo: string;
  generated_at: string;
  horizon_steps: number;
  step_hours: number;
  forecast: RealHourlyForecastPoint[];
}

// Card dự báo ngày đã qua adapter để render UI
export interface DisplayDailyCard {
  id: string;
  date: string;
  dayOfWeekVi: string;
  dayOfWeekEn: string;
  aqi: number;
  level: AQILevel;
}

// Card dự báo giờ đã qua adapter để render UI
export interface DisplayHourlyCard {
  id: string;
  timeStr: string;   // '10:00'
  dateStr: string;   // '25/09'
  aqi: number;
  level: AQILevel;
}
```

---

## 4. Kiến trúc Tầng Frontend (Client & State Architecture)

```
frontend/src/
├── services/
│   └── apiClient/
│       ├── airquality.api.ts         <-- Gọi fetch tới Backend
│       └── apiHelper.ts             <-- Xử lý base URL, timeout, parse lỗi
├── adapters/
│   └── forecast.adapter.ts          <-- Chuyển đổi dữ liệu API -> Dữ liệu hiển thị UI
├── hooks/
│   └── useAirQualityForecast.ts     <-- Quản lý gọi API, loading, error, refetch
└── pages/
    └── Forecast.tsx                 <-- Nhận state từ hook, render UI
```

### 4.1. Implementation `airquality.api.ts`
- Sử dụng native `fetch` hiện có trong dự án (không cài thêm axios để tránh phình bundle).
- Tích hợp `AbortSignal.timeout(8000)` để ngắt kết nối nếu backend hoặc ML service bị treo quá 8 giây.
- Bao bọc xử lý lỗi chuẩn xác:
  ```typescript
  export class ApiError extends Error {
    constructor(public status: number, message: string, public data?: any) {
      super(message);
      this.name = 'ApiError';
    }
  }
  ```
- 3 hàm client chính:
  1. `getDailyForecast(algo?: string): Promise<DailyForecastResponseData>`
  2. `getHourlyForecast(algo?: string): Promise<HourlyForecastResponseData>`
  3. `checkAirQualityHealth(): Promise<{ isHealthy: boolean; details?: any }>`

### 4.2. Adapter `forecast.adapter.ts`
- `toDisplayDailyCards(forecast: RealDailyForecastPoint[], lang: 'vi' | 'en'): DisplayDailyCard[]`:
  - Phân tích ngày qua `new Date(item.date)`.
  - Tạo chuỗi thứ tiếng Việt (`Thứ 2`, `Thứ 3`, ... hoặc `CN`) và tiếng Anh (`Mon`, `Tue`, ...).
  - Tự động fallback `level` thông qua `getAQICategory(item.aqi).level` nếu backend trả về `null`.
- `toDisplayHourlyCards(forecast: RealHourlyForecastPoint[]): DisplayHourlyCard[]`:
  - Format giờ hiển thị theo locale người dùng (`HH:mm`).
- `toChartData(dailyForecast: RealDailyForecastPoint[], lang: 'vi' | 'en')`:
  - Cung cấp data source tinh gọn cho `<LineChart>` của Recharts.

### 4.3. Custom Hook `useAirQualityForecast`
Cung cấp state tập trung:
```typescript
interface UseAirQualityForecastReturn {
  dailyData: DisplayDailyCard[];
  hourlyData: DisplayHourlyCard[];
  rawDaily: DailyForecastResponseData | null;
  rawHourly: HourlyForecastResponseData | null;
  isLoading: boolean;
  isMlServiceDown: boolean;
  error: string | null;
  selectedAlgo: string;
  setSelectedAlgo: (algo: string) => void;
  refetch: () => Promise<void>;
}
```

---

## 5. Trải nghiệm Người dùng (UX) & Giao diện Dự báo

### 5.1. Trạng thái Loading (Skeleton UI)
- Trong khi `isLoading = true`:
  - 7 thẻ dự báo ngày hiển thị hiệu ứng skeleton pulse dạng thẻ chữ nhật mờ bo góc tròn.
  - Vùng biểu đồ Recharts hiển thị skeleton pulse tương đương chiều cao 320px.
  - 8 thẻ dự báo giờ hiển thị pulse placeholder.
  - Ngăn chặn hiện tượng giật layout (layout shift).

### 5.2. Trạng thái Lỗi & Fallback Service (Error State)
- Nếu backend trả về HTTP 503 (`isMlServiceDown = true`):
  - Hiển thị banner cảnh báo trực quan với màu hổ phách/cam (amber/orange):
    > *"Dịch vụ Mô hình Trí tuệ Nhân tạo (ml-service) hiện đang khởi động hoặc chưa phản hồi. Dự báo chất lượng không khí tạm thời gián đoạn."*
  - Nút **"Thử kết nối lại" (Retry)** giúp người dùng thử gọi lại API mà không cần F5 toàn bộ trang.
- Nếu gặp lỗi mạng chung (Network Error): hiển thị thông báo lỗi rõ ràng.

### 5.3. Trạng thái Dữ liệu Sẵn sàng (Active State)
- **Ribbon 7 ngày:**
  - Hiển thị thứ, ngày tháng, chỉ số AQI to bản với màu sắc tương ứng mức độ cảnh báo (Good, Moderate, Unhealthy...).
  - Thẻ hôm nay (phần tử đầu tiên) được highlight viền cam nổi bật.
  - Bỏ phần hiển thị nhiệt độ / mưa giả lập cũ.
- **Biểu đồ 7 ngày (Recharts):**
  - Chuyển thành biểu đồ diện tích/đường tập trung: đường cong `aqi` màu cam đậm (`#F97316`) với diện tích đổ bóng gradient mượt mà (`AreaChart` hoặc `LineChart`).
  - Trục tung thể hiện thang đo AQI (0 - 300+).
  - Loại bỏ các đường phụ `maxTemp`, `minTemp`, `rainProbability` để bảo đảm tính trung thực dữ liệu NCKH.
- **Lưới dự báo 24 giờ:**
  - 8 mốc dự báo (cách nhau 3 tiếng), hiển thị rõ mốc thời gian (VD: `06:00`, `09:00`, `12:00`, `15:00`,..., `03:00`).
  - Chỉ số AQI nổi bật ở giữa cùng Badge đánh giá sức khỏe.
- **Bộ chọn Thuật toán & Thành phố:**
  - Thêm một badge trạng thái mô hình góc trên bên phải: `"Mô hình: SVR (Support Vector Regression)"`.
  - Dropdown thành phố: Nếu người dùng chuyển sang thành phố khác (ví dụ: *TP. Hồ Chí Minh*, *Đà Nẵng*), hiển thị thông tin chú thích: *"Dữ liệu dự báo AI hiện tại được huấn luyện riêng cho trạm Hà Nội. Tính năng cho các tỉnh thành khác đang trong giai đoạn huấn luyện."*

---

## 6. Kế hoạch Kiểm thử & Xác minh (Verification Checklist)

1. **Kiểm tra biên dịch Typescript:**
   - Chạy `npm run lint` hoặc `npx tsc --noEmit` trong thư mục `frontend`, đảm bảo 0 lỗi type.
2. **Kiểm tra khi Backend + ML Service đang chạy bình thường:**
   - Trang `/forecast` tải dữ liệu thật, render đúng 7 ngày và 8 mốc giờ.
   - Các chỉ số AQI khớp với kết quả trả về từ endpoint `/api/air-quality/predict/daily` và `/hourly`.
3. **Kiểm tra khả năng phục hồi lỗi (Fault Tolerance - 503):**
   - Tắt tạm thời `ml-service` (hoặc cấu hình sai URL ML trong backend `.env`).
   - Vào lại trang `/forecast`: Kiểm tra UI hiển thị đúng banner cảnh báo 503, không bị crash màn hình trắng (White Screen of Death).
   - Nhấn nút "Thử kết nối lại" sau khi bật lại ML service: dữ liệu cập nhật trở lại thành công.
4. **Kiểm tra tương thích Dark Mode & Đa ngôn ngữ (VI / EN):**
   - Kiểm tra các nhãn tiếng Việt và tiếng Anh (thứ trong tuần, thông báo lỗi, nút bấm).
   - Kiểm tra màu sắc biểu đồ và thẻ khi chuyển đổi giữa chế độ Light và Dark.

---

## 7. Các bước Triển khai tiếp theo (Next Steps)

Sau khi tài liệu thiết kế này được duyệt, tiến hành chuyển sang skill `writing-plans` để tạo kế hoạch triển khai chi tiết (`docs/superpowers/plans/2026-09-25-fe-be-aqi-forecast-integration-plan.md`) bao gồm:
1. Tạo type mới trong `frontend/src/types/airQuality.types.ts`.
2. Tạo API client & helper trong `frontend/src/services/apiClient/airquality.api.ts`.
3. Tạo adapter dữ liệu `frontend/src/adapters/forecast.adapter.ts`.
4. Tạo custom hook `frontend/src/hooks/useAirQualityForecast.ts`.
5. Cập nhật component `frontend/src/pages/Forecast.tsx` tích hợp skeleton loader, banner lỗi 503, và render dữ liệu thực.
6. Kiểm thử và xác minh toàn diện.
