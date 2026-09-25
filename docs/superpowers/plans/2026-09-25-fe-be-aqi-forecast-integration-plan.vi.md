# Kế hoạch Triển khai Kết nối Frontend ↔ Backend — Module Dự báo AQI

> **Dành cho Agentic Workers:** YÊU CẦU KỸ NĂNG: Sử dụng `superpowers:subagent-driven-development` (khuyến nghị) hoặc `superpowers:executing-plans` để triển khai kế hoạch này theo từng nhiệm vụ. Các bước sử dụng cú pháp checkbox (`- [ ]`) để theo dõi tiến độ.

**Mục tiêu:** Kết nối giao diện React Frontend (trang `Forecast.tsx`) với các API dự báo AQI của Express Backend (`/api/air-quality/predict/daily`, `/hourly`, và `/health`), thay thế dữ liệu mock tĩnh bằng dữ liệu dự báo AI thực tế từ mô hình máy học, tích hợp hiệu ứng skeleton khi tải trang, xử lý lỗi dự phòng thân thiện khi ML service tắt (mã HTTP 503) và đảm bảo tính trung thực khoa học của số liệu.

**Kiến trúc:** Kiến trúc phân tầng Frontend rõ ràng:
1. **Tầng API Client (`airquality.api.ts`):** Sử dụng `fetch` gốc của trình duyệt kết hợp `AbortSignal.timeout(8000)`, tự động unwrap cấu trúc bọc `{ success, data }` và ném lỗi kiểu `AirQualityApiError`.
2. **Tầng Adapter (`forecast.adapter.ts`):** Chứa các hàm thuần túy (pure functions) chuyển đổi dữ liệu phản hồi từ API sang model thẻ giao diện (`DisplayDailyCard`, `DisplayHourlyCard`), tự động tính toán thứ trong tuần theo ngôn ngữ (`Thứ 2`, `Thứ 3`...), định dạng mốc giờ 24h (`10:00`), và tự động fallback cấp độ AQI nếu `level: null` bằng `getAQICategory`.
3. **Tầng Custom Hook (`useAirQualityForecast.ts`):** Điều phối việc gọi song song API dự báo ngày & giờ, quản lý trạng thái tải (`isLoading`), phát hiện sự cố gián đoạn của ML service (lỗi 503), và cung cấp hàm gọi lại (`refetch`).
4. **Tầng Hiển thị UI (`Forecast.tsx`):** Render skeleton pulse khi đang fetch, hiển thị banner cảnh báo màu hổ phách khi dịch vụ AI bị gián đoạn (kèm nút "Thử lại"), vẽ biểu đồ Recharts đường AQI tinh gọn không chứa thông số thời tiết giả lập, và hiển thị thông báo phạm vi trạm khi người dùng chọn thành phố ngoài Hà Nội.

**Công nghệ sử dụng:** React 19, TypeScript 5.8, Vite 6, Tailwind CSS 4, Recharts 3, Lucide React, Node.js native test runner (`node:test`, `node:assert`, `tsx`).

**Tài liệu Spec liên kết:** [docs/superpowers/specs/2026-09-25-fe-be-aqi-forecast-integration-design.md](file:///C:/.Study%20at%20Home/.NCKH/NCKH/docs/superpowers/specs/2026-09-25-fe-be-aqi-forecast-integration-design.md)

---

## Các Ràng buộc Toàn cục (Global Constraints)

- **Tính trung thực khoa học (NCKH):** Tuyệt đối không sinh số liệu giả lập (mock/fake) cho các tham số thời tiết (nhiệt độ min/max, xác suất mưa, trạng thái thời tiết) hay thành phần ô nhiễm chi tiết (`pm25`, `pm10`) khi mô hình AI hiện tại chỉ dự báo chỉ số AQI tổng thể. Ẩn hoặc loại bỏ các trường chưa có mô hình.
- **Khả năng chịu lỗi (Fault Tolerance):** Khi `ml-service` không phản hồi hoặc trả về mã HTTP 503, giao diện tuyệt đối không được crash hoặc để màn hình trắng (White Screen of Death); phải hiển thị banner thông báo lỗi thân thiện kèm nút "Thử kết nối lại" (Retry).
- **Phạm vi địa lý của Mô hình:** Các mô hình học máy hiện tại được huấn luyện riêng biệt từ trạm quan trắc Hà Nội (`city: 'hanoi'`). Khi người dùng chọn các tỉnh thành khác trong dropdown, giao diện phải hiển thị thông báo giải thích rõ ràng rằng dự báo AI hiện áp dụng cho trạm Hà Nội để tham khảo.
- **Không cài thêm thư viện mạng nặng:** Dùng native `fetch` của trình duyệt (không cài đặt `axios` hay `react-query` nhằm giữ dung lượng bundle tối ưu).
- **Kiểm tra kiểu TypeScript nghiêm ngặt:** Toàn bộ mã nguồn phải vượt qua `npm run lint` (`tsc --noEmit`) với 0 lỗi cảnh báo.
- **Miễn trừ xác thực:** Các endpoint `/api/air-quality/*` của backend là public, không yêu cầu JWT header.

---

## Trọng tâm Kiểm duyệt (Review Focus)

1. **Khi ML Service tắt hoặc gián đoạn (HTTP 503):** Backend trả về 503 do không nối được tới `ml-service`, `airquality.api.ts` phải phân tích chính xác `body.message` thành `AirQualityApiError(status=503, isMlServiceDown=true)`, hook cập nhật cờ `isMlServiceDown = true`, và UI hiển thị banner cảnh báo với nút "Thử lại".
2. **Xử lý cấp độ AQI bị Null (`level: null`):** Nếu backend/ML service trả về `level: null` ở một mốc dự báo, `forecast.adapter.ts` phải tự động suy luận ra mức `AQILevel` chuẩn xác thông qua `getAQICategory(aqi).level`.
3. **Tính toán Thứ trong tuần chính xác:** Chuỗi ngày (ví dụ: `'2026-09-26'`) phải chuyển đổi chính xác thành tên thứ tiếng Việt (`Thứ 7`, `Chủ Nhật`...) và tiếng Anh (`Sat`, `Sun`...) mà không bị sai lệch múi giờ.
4. **Định dạng Mốc giờ 24h:** Chuỗi thời gian ISO (`2026-09-25T10:00:00Z`) phải được format sạch thành `HH:mm` (ví dụ `10:00`) mà không bị lỗi `NaN:NaN`.
5. **Cơ chế Timeout cho Request:** Yêu cầu mạng vượt quá 8 giây phải được tự động hủy thông qua `AbortSignal.timeout(8000)` và thông báo lỗi timeout rõ ràng thay vì treo request vô hạn.

---

## Sơ đồ Phân chia File và Trách nhiệm

- `frontend/.env.example`: Khai báo biến môi trường mẫu `VITE_API_BASE_URL=http://localhost:3000/api`.
- `frontend/.env`: Biến môi trường cục bộ dùng cho môi trường dev.
- `frontend/src/types/airQuality.types.ts`: Định nghĩa các kiểu `RealDailyForecastPoint`, `RealHourlyForecastPoint`, envelope phản hồi API và kiểu thẻ hiển thị.
- `frontend/src/services/apiClient/airquality.api.ts`: Triển khai các hàm gọi API (`getDailyForecast`, `getHourlyForecast`, `checkMlServiceHealth`) và lớp lỗi `AirQualityApiError`.
- `frontend/src/adapters/forecast.adapter.ts`: Các hàm thuần túy chuyển đổi dữ liệu từ API sang cấu trúc giao diện và dữ liệu cho Recharts.
- `frontend/src/hooks/useAirQualityForecast.ts`: Custom React hook đóng gói toàn bộ trạng thái bất đồng bộ, loading, bắt lỗi và gọi lại API.
- `frontend/src/pages/Forecast.tsx`: Trang giao diện hoàn chỉnh tích hợp skeleton loading, banner 503, ribbon 7 ngày thực, lưới 24h thực và biểu đồ AQI tinh gọn.
- `frontend/tests/forecast.adapter.test.ts`: Bộ test tự động kiểm thử tầng Adapter.
- `frontend/tests/airquality.api.test.ts`: Bộ test tự động kiểm thử API client, timeout và xử lý lỗi 503.

---

### Nhiệm vụ 1: Cấu hình Môi trường & Khai báo Kiểu TypeScript cho Dữ liệu Thực

**Danh sách file:**
- Chỉnh sửa: `frontend/.env.example`
- Chỉnh sửa: `frontend/.env`
- Chỉnh sửa: `frontend/src/types/airQuality.types.ts`
- File test: `frontend/tests/types.test.ts`

**Giao diện:**
- Cung cấp: `RealAQILevel`, `RealDailyForecastPoint`, `DailyForecastResponseData`, `RealHourlyForecastPoint`, `HourlyForecastResponseData`, `DisplayDailyCard`, `DisplayHourlyCard`.

- [ ] **Bước 1: Viết bài test kiểm tra kiểu (Type assertion test)**

Tạo file `frontend/tests/types.test.ts`:

```typescript
import test from 'node:test';
import assert from 'node:assert/strict';
import type {
  RealDailyForecastPoint,
  DailyForecastResponseData,
  RealHourlyForecastPoint,
  HourlyForecastResponseData,
  DisplayDailyCard,
  DisplayHourlyCard
} from '../src/types/airQuality.types';

test('Khai báo kiểu dữ liệu khớp chính xác với cấu trúc hợp đồng API', () => {
  const dailyPoint: RealDailyForecastPoint = {
    date: '2026-09-26',
    aqi: 132.4,
    level: 'unhealthy_sensitive',
  };

  const dailyResponse: DailyForecastResponseData = {
    city: 'hanoi',
    algo: 'svr',
    generated_at: '2026-09-25T07:00:00Z',
    horizon_days: 7,
    forecast: [dailyPoint],
  };

  const hourlyPoint: RealHourlyForecastPoint = {
    timestamp: '2026-09-25T10:00:00Z',
    aqi: 145.2,
    level: null,
  };

  const hourlyResponse: HourlyForecastResponseData = {
    city: 'hanoi',
    algo: 'svr',
    generated_at: '2026-09-25T07:00:00Z',
    horizon_steps: 8,
    step_hours: 3,
    forecast: [hourlyPoint],
  };

  assert.equal(dailyResponse.forecast.length, 1);
  assert.equal(hourlyResponse.forecast[0].level, null);
});
```

- [ ] **Bước 2: Chạy test và xác nhận test thất bại (Fail)**

Chạy:
```powershell
npx tsx --test frontend/tests/types.test.ts
```
Kết quả mong đợi: FAIL do các kiểu mới chưa được export từ `airQuality.types.ts`.

- [ ] **Bước 3: Cập nhật `.env.example`, `.env`, và `airQuality.types.ts`**

Cập nhật `frontend/.env.example`:
```
VITE_API_BASE_URL=http://localhost:3000/api
```

Đảm bảo `frontend/.env` có:
```
VITE_API_BASE_URL=http://localhost:3000/api
```

Thêm các interface sau vào cuối file [frontend/src/types/airQuality.types.ts](file:///C:/.Study%20at%20Home/.NCKH/NCKH/frontend/src/types/airQuality.types.ts):

```typescript
// ── Types cho dữ liệu THỰC TẾ từ ML Service & Backend ──
export type RealAQILevel = AQILevel | null;

export interface RealDailyForecastPoint {
  date: string;       // Định dạng 'YYYY-MM-DD'
  aqi: number;        // Ví dụ: 132.4
  level?: RealAQILevel;
}

export interface DailyForecastResponseData {
  city: string;
  algo: string;
  generated_at: string;
  horizon_days: number;
  forecast: RealDailyForecastPoint[];
}

export interface RealHourlyForecastPoint {
  timestamp: string;  // Chuỗi ISO datetime '2026-09-25T10:00:00Z'
  aqi: number;
  level?: RealAQILevel;
}

export interface HourlyForecastResponseData {
  city: string;
  algo: string;
  generated_at: string;
  horizon_steps: number;
  step_hours: number;
  forecast: RealHourlyForecastPoint[];
}

export interface DisplayDailyCard {
  id: string;
  date: string;
  dayOfWeekVi: string;
  dayOfWeekEn: string;
  aqi: number;
  level: AQILevel;
}

export interface DisplayHourlyCard {
  id: string;
  timeStr: string;   // '10:00'
  dateStr: string;   // '25/09'
  aqi: number;
  level: AQILevel;
}
```

- [ ] **Bước 4: Chạy lại test và xác nhận test vượt qua (Pass)**

Chạy:
```powershell
npx tsx --test frontend/tests/types.test.ts
```
Kết quả mong đợi: PASS.

- [ ] **Bước 5: Commit mã nguồn**

```bash
git add frontend/.env.example frontend/.env frontend/src/types/airQuality.types.ts frontend/tests/types.test.ts
git commit -m "feat(fe): add real ML forecast types and env config"
```

---

### Nhiệm vụ 2: Xây dựng API Client có Hỗ trợ Timeout và Bắt Lỗi 503

**Danh sách file:**
- Chỉnh sửa: `frontend/src/services/apiClient/airquality.api.ts`
- File test: `frontend/tests/airquality.api.test.ts`

**Giao diện:**
- Tiêu thụ: `DailyForecastResponseData`, `HourlyForecastResponseData`.
- Cung cấp: `airQualityApi.getDailyForecast(algo?: string)`, `airQualityApi.getHourlyForecast(algo?: string)`, `airQualityApi.checkMlServiceHealth()`, lớp `AirQualityApiError`.

- [ ] **Bước 1: Viết test cho API Client (giả lập mock fetch)**

Tạo file `frontend/tests/airquality.api.test.ts`:

```typescript
import test from 'node:test';
import assert from 'node:assert/strict';
import { airQualityApi, AirQualityApiError } from '../src/services/apiClient/airquality.api';

test('airQualityApi.getDailyForecast giải nén thành công dữ liệu từ envelope response', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () =>
    new Response(
      JSON.stringify({
        success: true,
        data: {
          city: 'hanoi',
          algo: 'svr',
          generated_at: '2026-09-25T07:00:00Z',
          horizon_days: 7,
          forecast: [{ date: '2026-09-26', aqi: 120.0, level: 'unhealthy_sensitive' }],
        },
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );

  try {
    const res = await airQualityApi.getDailyForecast('svr');
    assert.equal(res.city, 'hanoi');
    assert.equal(res.forecast.length, 1);
    assert.equal(res.forecast[0].aqi, 120.0);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('airQualityApi ném lỗi AirQualityApiError mã 503 khi ML service ngừng hoạt động', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () =>
    new Response(
      JSON.stringify({
        success: false,
        message: 'Dịch vụ AI/ML (ml-service) hiện không phản hồi. Vui lòng kiểm tra lại dịch vụ.',
      }),
      { status: 503, headers: { 'Content-Type': 'application/json' } }
    );

  try {
    await assert.rejects(
      async () => {
        await airQualityApi.getDailyForecast('svr');
      },
      (err: any) => {
        assert(err instanceof AirQualityApiError);
        assert.equal(err.status, 503);
        assert.equal(err.isMlServiceDown, true);
        assert.match(err.message, /ml-service/);
        return true;
      }
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});
```

- [ ] **Bước 2: Chạy test và xác nhận test thất bại (Fail)**

Chạy:
```powershell
npx tsx --test frontend/tests/airquality.api.test.ts
```
Kết quả mong đợi: FAIL do `airQualityApi` chưa được viết logic thật.

- [ ] **Bước 3: Viết mã nguồn cho `frontend/src/services/apiClient/airquality.api.ts`**

Ghi đè nội dung file [frontend/src/services/apiClient/airquality.api.ts](file:///C:/.Study%20at%20Home/.NCKH/NCKH/frontend/src/services/apiClient/airquality.api.ts):

```typescript
import type {
  DailyForecastResponseData,
  HourlyForecastResponseData,
} from '../../types/airQuality.types';

const API_BASE_URL =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_BASE_URL) ||
  'http://localhost:3000/api';

export interface ApiEnvelope<T> {
  success: boolean;
  data?: T;
  message?: string;
  mlService?: any;
  error?: string;
}

export class AirQualityApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public isMlServiceDown: boolean = false
  ) {
    super(message);
    this.name = 'AirQualityApiError';
  }
}

async function request<T>(endpoint: string, timeoutMs: number = 8000): Promise<T> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(`${API_BASE_URL}${endpoint}`, {
      signal: controller.signal,
      headers: {
        'Accept': 'application/json',
      },
    });

    let body: ApiEnvelope<T> | null = null;
    try {
      body = await res.json();
    } catch {
      // Phản hồi không phải JSON hợp lệ
    }

    if (!res.ok || !body?.success) {
      const errorMessage =
        body?.message || `Lỗi kết nối máy chủ (${res.status} ${res.statusText})`;
      const isMlDown = res.status === 503;
      throw new AirQualityApiError(errorMessage, res.status, isMlDown);
    }

    return body.data as T;
  } catch (error: any) {
    if (error instanceof AirQualityApiError) {
      throw error;
    }
    if (error.name === 'AbortError') {
      throw new AirQualityApiError(
        'Yêu cầu kết nối quá thời gian chờ (8 giây). Vui lòng thử lại.',
        408,
        false
      );
    }
    throw new AirQualityApiError(
      error.message || 'Không thể kết nối đến máy chủ Backend.',
      0,
      false
    );
  } finally {
    clearTimeout(timeoutId);
  }
}

export const airQualityApi = {
  async getDailyForecast(algo: string = 'svr'): Promise<DailyForecastResponseData> {
    return request<DailyForecastResponseData>(`/air-quality/predict/daily?algo=${encodeURIComponent(algo)}`);
  },

  async getHourlyForecast(algo: string = 'svr'): Promise<HourlyForecastResponseData> {
    return request<HourlyForecastResponseData>(`/air-quality/predict/hourly?algo=${encodeURIComponent(algo)}`);
  },

  async checkMlServiceHealth(): Promise<{ isHealthy: boolean; details?: any }> {
    try {
      const res = await fetch(`${API_BASE_URL}/air-quality/health`, {
        signal: AbortSignal.timeout(5000),
      });
      const body: ApiEnvelope<any> = await res.json();
      return {
        isHealthy: res.ok && body.success === true,
        details: body.mlService,
      };
    } catch {
      return { isHealthy: false };
    }
  },
};
```

- [ ] **Bước 4: Chạy lại test và xác nhận test vượt qua (Pass)**

Chạy:
```powershell
npx tsx --test frontend/tests/airquality.api.test.ts
```
Kết quả mong đợi: PASS.

- [ ] **Bước 5: Commit mã nguồn**

```bash
git add frontend/src/services/apiClient/airquality.api.ts frontend/tests/airquality.api.test.ts
git commit -m "feat(fe): implement airquality API client with timeout and error handling"
```

---

### Nhiệm vụ 3: Xây dựng Tầng Adapter Chuyển đổi Dữ liệu Hiển thị

**Danh sách file:**
- Tạo mới: `frontend/src/adapters/forecast.adapter.ts`
- File test: `frontend/tests/forecast.adapter.test.ts`

**Giao diện:**
- Tiêu thụ: `RealDailyForecastPoint[]`, `RealHourlyForecastPoint[]`.
- Cung cấp: `toDisplayDailyCards(forecast, lang)`, `toDisplayHourlyCards(forecast)`, `toChartData(forecast, lang)`.

- [ ] **Bước 1: Viết test cho tầng Adapter**

Tạo file `frontend/tests/forecast.adapter.test.ts`:

```typescript
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  toDisplayDailyCards,
  toDisplayHourlyCards,
  toChartData,
  formatWeekday,
} from '../src/adapters/forecast.adapter';

test('formatWeekday trả về chính xác thứ trong tuần tiếng Việt và tiếng Anh', () => {
  // 2026-09-26 là Thứ Bảy
  const vi = formatWeekday('2026-09-26', 'vi');
  const en = formatWeekday('2026-09-26', 'en');
  assert.equal(vi, 'Thứ 7');
  assert.equal(en, 'Sat');
});

test('toDisplayDailyCards xử lý trường hợp level là null bằng cách tự động gọi getAQICategory', () => {
  const points = [
    { date: '2026-09-26', aqi: 45.0, level: null },
    { date: '2026-09-27', aqi: 155.0, level: 'unhealthy' as const },
  ];
  const cards = toDisplayDailyCards(points, 'vi');

  assert.equal(cards.length, 2);
  assert.equal(cards[0].level, 'good'); // 45 AQI thuộc mức tốt (good)
  assert.equal(cards[0].dayOfWeekVi, 'Thứ 7');
  assert.equal(cards[1].level, 'unhealthy');
});

test('toDisplayHourlyCards định dạng chuẩn mốc thời gian thành HH:mm', () => {
  const points = [
    { timestamp: '2026-09-25T10:00:00Z', aqi: 90.0, level: null },
  ];
  const cards = toDisplayHourlyCards(points);
  assert.equal(cards.length, 1);
  assert.match(cards[0].timeStr, /^\d{2}:\d{2}$/);
  assert.equal(cards[0].level, 'moderate');
});

test('toChartData định dạng chuẩn mảng dữ liệu cho Recharts', () => {
  const points = [
    { date: '2026-09-26', aqi: 125.4, level: null },
  ];
  const chartData = toChartData(points, 'vi');
  assert.equal(chartData.length, 1);
  assert.equal(chartData[0].aqi, 125);
  assert.equal(chartData[0].dayOfWeek, 'Thứ 7');
});
```

- [ ] **Bước 2: Chạy test và xác nhận test thất bại (Fail)**

Chạy:
```powershell
npx tsx --test frontend/tests/forecast.adapter.test.ts
```
Kết quả mong đợi: FAIL do file `forecast.adapter.ts` chưa được tạo.

- [ ] **Bước 3: Viết mã nguồn cho `frontend/src/adapters/forecast.adapter.ts`**

Tạo file [frontend/src/adapters/forecast.adapter.ts](file:///C:/.Study%20at%20Home/.NCKH/NCKH/frontend/src/adapters/forecast.adapter.ts):

```typescript
import type {
  RealDailyForecastPoint,
  RealHourlyForecastPoint,
  DisplayDailyCard,
  DisplayHourlyCard,
  AQILevel,
} from '../types/airQuality.types';
import { getAQICategory } from '../utils/aqi.util';

const VI_WEEKDAYS = ['Chủ Nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
const EN_WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function formatWeekday(dateStr: string, lang: 'vi' | 'en' = 'vi'): string {
  // Lấy mốc 12h trưa để tránh nhảy ngày do chênh lệch múi giờ
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]), 12, 0, 0);
  const dayIndex = d.getDay();
  return lang === 'vi' ? VI_WEEKDAYS[dayIndex] : EN_WEEKDAYS[dayIndex];
}

export function formatDateLabel(dateStr: string): string {
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}`;
  }
  return dateStr;
}

export function resolveAQILevel(aqi: number, level?: AQILevel | null): AQILevel {
  if (level) return level;
  return getAQICategory(aqi).level;
}

export function toDisplayDailyCards(
  forecast: RealDailyForecastPoint[],
  lang: 'vi' | 'en' = 'vi'
): DisplayDailyCard[] {
  return forecast.map((point, index) => {
    return {
      id: `daily-${point.date}-${index}`,
      date: formatDateLabel(point.date),
      dayOfWeekVi: formatWeekday(point.date, 'vi'),
      dayOfWeekEn: formatWeekday(point.date, 'en'),
      aqi: point.aqi,
      level: resolveAQILevel(point.aqi, point.level as AQILevel),
    };
  });
}

export function toDisplayHourlyCards(
  forecast: RealHourlyForecastPoint[]
): DisplayHourlyCard[] {
  return forecast.map((point, index) => {
    const d = new Date(point.timestamp);
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');

    return {
      id: `hourly-${point.timestamp}-${index}`,
      timeStr: `${hours}:${minutes}`,
      dateStr: `${day}/${month}`,
      aqi: point.aqi,
      level: resolveAQILevel(point.aqi, point.level as AQILevel),
    };
  });
}

export interface ChartDataPoint {
  date: string;
  dayOfWeek: string;
  aqi: number;
}

export function toChartData(
  forecast: RealDailyForecastPoint[],
  lang: 'vi' | 'en' = 'vi'
): ChartDataPoint[] {
  return forecast.map((point) => ({
    date: formatDateLabel(point.date),
    dayOfWeek: formatWeekday(point.date, lang),
    aqi: Math.round(point.aqi),
  }));
}
```

- [ ] **Bước 4: Chạy lại test và xác nhận test vượt qua (Pass)**

Chạy:
```powershell
npx tsx --test frontend/tests/forecast.adapter.test.ts
```
Kết quả mong đợi: PASS.

- [ ] **Bước 5: Commit mã nguồn**

```bash
git add frontend/src/adapters/forecast.adapter.ts frontend/tests/forecast.adapter.test.ts
git commit -m "feat(fe): implement forecast adapter layer for UI presentation"
```

---

### Nhiệm vụ 4: Xây dựng Custom Hook `useAirQualityForecast`

**Danh sách file:**
- Tạo mới: `frontend/src/hooks/useAirQualityForecast.ts`

**Giao diện:**
- Tiêu thụ: `airQualityApi.getDailyForecast`, `airQualityApi.getHourlyForecast`, các hàm adapter.
- Cung cấp: `useAirQualityForecast({ algo, lang }) -> { dailyCards, hourlyCards, chartData, isLoading, isMlServiceDown, error, refetch }`.

- [ ] **Bước 1: Viết mã nguồn `useAirQualityForecast.ts`**

Tạo file [frontend/src/hooks/useAirQualityForecast.ts](file:///C:/.Study%20at%20Home/.NCKH/NCKH/frontend/src/hooks/useAirQualityForecast.ts):

```typescript
import { useState, useEffect, useCallback } from 'react';
import { airQualityApi, AirQualityApiError } from '../services/apiClient/airquality.api';
import {
  toDisplayDailyCards,
  toDisplayHourlyCards,
  toChartData,
  DisplayDailyCard,
  DisplayHourlyCard,
  ChartDataPoint,
} from '../adapters/forecast.adapter';
import type {
  DailyForecastResponseData,
  HourlyForecastResponseData,
} from '../types/airQuality.types';

interface UseAirQualityForecastOptions {
  algo?: string;
  lang?: 'vi' | 'en';
}

export interface UseAirQualityForecastReturn {
  dailyCards: DisplayDailyCard[];
  hourlyCards: DisplayHourlyCard[];
  chartData: ChartDataPoint[];
  rawDaily: DailyForecastResponseData | null;
  rawHourly: HourlyForecastResponseData | null;
  isLoading: boolean;
  isMlServiceDown: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useAirQualityForecast({
  algo = 'svr',
  lang = 'vi',
}: UseAirQualityForecastOptions = {}): UseAirQualityForecastReturn {
  const [dailyCards, setDailyCards] = useState<DisplayDailyCard[]>([]);
  const [hourlyCards, setHourlyCards] = useState<DisplayHourlyCard[]>([]);
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [rawDaily, setRawDaily] = useState<DailyForecastResponseData | null>(null);
  const [rawHourly, setRawHourly] = useState<HourlyForecastResponseData | null>(null);

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isMlServiceDown, setIsMlServiceDown] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setIsMlServiceDown(false);
    setError(null);

    try {
      const [dailyRes, hourlyRes] = await Promise.all([
        airQualityApi.getDailyForecast(algo),
        airQualityApi.getHourlyForecast(algo),
      ]);

      setRawDaily(dailyRes);
      setRawHourly(hourlyRes);
      setDailyCards(toDisplayDailyCards(dailyRes.forecast, lang));
      setHourlyCards(toDisplayHourlyCards(hourlyRes.forecast));
      setChartData(toChartData(dailyRes.forecast, lang));
    } catch (err: any) {
      if (err instanceof AirQualityApiError) {
        setIsMlServiceDown(err.isMlServiceDown || err.status === 503);
        setError(err.message);
      } else {
        setError(err?.message || 'Không thể tải dữ liệu dự báo.');
      }
    } finally {
      setIsLoading(false);
    }
  }, [algo, lang]);

  useEffect(() => {
    let mounted = true;
    fetchData();
    return () => {
      mounted = false;
    };
  }, [fetchData]);

  return {
    dailyCards,
    hourlyCards,
    chartData,
    rawDaily,
    rawHourly,
    isLoading,
    isMlServiceDown,
    error,
    refetch: fetchData,
  };
}
```

- [ ] **Bước 2: Kiểm tra biên dịch kiểu TypeScript**

Chạy:
```powershell
npx tsc --noEmit
```
Kết quả mong đợi: PASS với 0 lỗi.

- [ ] **Bước 3: Commit mã nguồn**

```bash
git add frontend/src/hooks/useAirQualityForecast.ts
git commit -m "feat(fe): add useAirQualityForecast hook for lifecycle and error management"
```

---

### Nhiệm vụ 5: Tích hợp Giao diện `Forecast.tsx` với Skeleton Loader & Banner Lỗi 503

**Danh sách file:**
- Chỉnh sửa: `frontend/src/pages/Forecast.tsx`

**Giao diện:**
- Tiêu thụ: `useAirQualityForecast`, `getAQICategory`, `AQIBadge`.
- Cung cấp: Trang Forecast hoàn chỉnh hiển thị dữ liệu AI thực tế.

- [ ] **Bước 1: Cập nhật `Forecast.tsx`**

Cập nhật toàn bộ [frontend/src/pages/Forecast.tsx](file:///C:/.Study%20at%20Home/.NCKH/NCKH/frontend/src/pages/Forecast.tsx):

```tsx
import React, { useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { getAQICategory } from '../utils/aqi.util';
import { AQIBadge } from '../components/AQIBadge';
import { FadeIn } from '../components/FadeIn';
import { useAirQualityForecast } from '../hooks/useAirQualityForecast';
import {
  MapPin,
  Clock,
  AlertTriangle,
  RefreshCw,
  Cpu,
  Info,
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';

export const Forecast: React.FC = () => {
  const { lang } = useLanguage();
  const [selectedCity, setSelectedCity] = useState('Hà Nội');

  const {
    dailyCards,
    hourlyCards,
    chartData,
    isLoading,
    isMlServiceDown,
    error,
    refetch,
  } = useAirQualityForecast({ algo: 'svr', lang });

  const cityOptions = ['Hà Nội', 'TP. Hồ Chí Minh', 'Đà Nẵng', 'Hải Phòng', 'Cần Thơ', 'Đà Lạt'];
  const isHanoi = selectedCity === 'Hà Nội';

  return (
    <div className="w-full space-y-10 pb-20">
      <FadeIn direction="up">
        {/* Header and City Selector */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                {lang === 'vi'
                  ? 'Dự báo Chất lượng Không khí (AQI AI)'
                  : 'AI Air Quality Forecast (AQI)'}
              </h1>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-orange-100 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400 border border-orange-200 dark:border-orange-800">
                <Cpu className="w-3 h-3" />
                SVR Model
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {lang === 'vi'
                ? 'Mô hình học máy hồi quy vector hỗ trợ (SVR) kết hợp trạm quan trắc địa phương'
                : 'Support Vector Regression (SVR) model trained on local ground station atmospheric data'}
            </p>
          </div>

          <div className="flex items-center gap-2 bg-white dark:surface-card border border-slate-200 surface-border p-1.5 rounded-2xl shadow-sm self-start sm:self-auto cursor-pointer">
            <MapPin className="w-4 h-4 text-orange-500 ml-2" />
            <select
              value={selectedCity}
              onChange={(e) => setSelectedCity(e.target.value)}
              className="bg-transparent text-xs font-bold text-slate-900 dark:text-white focus:outline-none pr-3 cursor-pointer"
            >
              {cityOptions.map((c) => (
                <option key={c} value={c} className="dark:bg-[var(--bg-card-header)]">
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Thông báo phạm vi trạm khi chọn thành phố khác Hà Nội */}
        {!isHanoi && (
          <div className="mt-4 p-4 rounded-2xl bg-sky-50 dark:bg-sky-950/20 border border-sky-200 dark:border-sky-800/40 flex items-start gap-3 text-sky-800 dark:text-sky-300 text-xs">
            <Info className="w-5 h-5 flex-shrink-0 text-sky-500 mt-0.5" />
            <div>
              <p className="font-bold">
                {lang === 'vi'
                  ? `Thông báo về trạm dự báo cho ${selectedCity}`
                  : `Forecast station notice for ${selectedCity}`}
              </p>
              <p className="mt-0.5 text-sky-700 dark:text-sky-400">
                {lang === 'vi'
                  ? 'Mô hình AI hiện tại được huấn luyện từ tập dữ liệu trạm quan trắc Hà Nội. Dữ liệu bên dưới phản ánh mô hình Hà Nội dùng cho mục đích tham khảo.'
                  : 'The AI model is currently trained on Hanoi monitoring stations. Data below reflects Hanoi predictions for reference.'}
              </p>
            </div>
          </div>
        )}

        {/* Banner Cảnh báo lỗi / 503 khi ML service tắt */}
        {error && (
          <div className="mt-4 p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-amber-900 dark:text-amber-300 text-xs">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 flex-shrink-0 text-amber-500 mt-0.5" />
              <div>
                <p className="font-bold">
                  {isMlServiceDown
                    ? (lang === 'vi' ? 'Dịch vụ AI (ML Service) chưa sẵn sàng' : 'AI Service Unavailable')
                    : (lang === 'vi' ? 'Không thể tải dữ liệu dự báo' : 'Failed to Load Forecast')}
                </p>
                <p className="mt-0.5 text-amber-800 dark:text-amber-400">{error}</p>
              </div>
            </div>
            <button
              onClick={() => refetch()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs transition-colors self-start sm:self-auto cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              {lang === 'vi' ? 'Thử lại' : 'Retry'}
            </button>
          </div>
        )}

        {/* Ribbon 7 Thẻ Dự báo Ngày */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-3.5 mt-8">
          {isLoading
            ? Array.from({ length: 7 }).map((_, idx) => (
                <div
                  key={`skeleton-daily-${idx}`}
                  className="p-4 rounded-3xl border border-slate-200 surface-border bg-white dark:surface-card animate-pulse h-36 flex flex-col justify-between"
                >
                  <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-1/2"></div>
                  <div className="h-10 w-14 bg-slate-200 dark:bg-slate-800 rounded-2xl mx-auto my-2"></div>
                  <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-3/4 mx-auto"></div>
                </div>
              ))
            : dailyCards.map((day, idx) => {
                const cat = getAQICategory(day.aqi);
                const isToday = idx === 0;
                return (
                  <div
                    key={day.id}
                    className={`p-4 rounded-3xl border transition-all flex flex-col justify-between cursor-pointer hover:shadow-xl hover:-translate-y-1 ${
                      isToday
                        ? 'border-orange-500 bg-orange-50/40 dark:bg-orange-950/20 shadow-md ring-2 ring-orange-500/20'
                        : 'border-slate-200 surface-border bg-white dark:surface-card hover:border-orange-400'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black text-slate-900 dark:text-white">
                          {lang === 'vi' ? day.dayOfWeekVi : day.dayOfWeekEn}
                        </span>
                        <span className="text-[10px] text-slate-400 font-bold">{day.date}</span>
                      </div>

                      <div className="my-3 text-center">
                        <div
                          className="inline-flex items-center justify-center w-14 h-14 rounded-2xl shadow-sm font-black text-xl mx-auto"
                          style={{ backgroundColor: cat.bgColor, color: cat.color }}
                        >
                          {Math.round(day.aqi)}
                        </div>
                        <div className="mt-1.5">
                          <AQIBadge aqi={day.aqi} size="sm" showIcon={false} />
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
        </div>

        {/* Biểu đồ Recharts Diễn biến AQI 7 Ngày */}
        <div className="mt-8 p-6 sm:p-8 rounded-3xl bg-white dark:surface-card border border-slate-200 surface-border shadow-xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {lang === 'vi' ? 'Biểu đồ Diễn biến AQI Dự báo 7 Ngày' : '7-Day AQI Forecast Trend'}
              </h3>
              <p className="text-xs text-slate-500">
                {lang === 'vi'
                  ? 'Xu hướng chỉ số chất lượng không khí dự báo từ mô hình SVR'
                  : 'Predicted Air Quality Index trajectory powered by SVR model'}
              </p>
            </div>
          </div>

          <div className="h-72 w-full">
            {isLoading ? (
              <div className="w-full h-full rounded-2xl bg-slate-100 dark:bg-slate-900 animate-pulse flex items-center justify-center text-xs text-slate-400">
                {lang === 'vi' ? 'Đang tải biểu đồ...' : 'Loading chart...'}
              </div>
            ) : chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 20, right: 20, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" opacity={0.35} vertical={false} />
                  <XAxis dataKey="dayOfWeek" stroke="#94A3B8" fontSize={11} tickLine={false} />
                  <YAxis stroke="#F97316" fontSize={11} tickLine={false} domain={[0, 'auto']} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'var(--bg-card-header)',
                      borderColor: 'var(--border-color)',
                      borderRadius: '12px',
                      color: '#F8FAFC',
                      fontSize: '12px',
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="aqi"
                    name="Chỉ số AQI VN"
                    stroke="#F97316"
                    strokeWidth={3}
                    dot={{ r: 5, fill: '#F97316' }}
                    activeDot={{ r: 7 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="w-full h-full flex items-center justify-center text-xs text-slate-400">
                {lang === 'vi' ? 'Chưa có dữ liệu biểu đồ' : 'No chart data available'}
              </div>
            )}
          </div>
        </div>

        {/* Lưới Dự báo Chi tiết 24 Giờ (Bước nhảy 3h) */}
        <div className="mt-8 space-y-4">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-orange-500" />
            <h3 className="text-lg font-black text-slate-900 dark:text-white">
              {lang === 'vi' ? 'Dự báo chi tiết 24 giờ tới (bước nhảy 3h)' : '24-Hour Detailed Forecast (3h Steps)'}
            </h3>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
            {isLoading
              ? Array.from({ length: 8 }).map((_, idx) => (
                  <div
                    key={`skeleton-hourly-${idx}`}
                    className="p-4 rounded-2xl bg-white dark:surface-card border border-slate-200 surface-border animate-pulse h-28 flex flex-col justify-between"
                  >
                    <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded w-1/2 mx-auto"></div>
                    <div className="h-8 bg-slate-200 dark:bg-slate-800 rounded-xl my-1"></div>
                    <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded w-3/4 mx-auto"></div>
                  </div>
                ))
              : hourlyCards.map((item) => {
                  const cat = getAQICategory(item.aqi);
                  return (
                    <div
                      key={item.id}
                      className="p-3.5 rounded-2xl bg-white dark:surface-card border border-slate-200 surface-border shadow-sm text-center space-y-2 cursor-pointer hover:shadow-md hover:-translate-y-0.5 hover:border-orange-400 transition-all"
                    >
                      <div>
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">{item.timeStr}</span>
                        <span className="text-[10px] text-slate-400 block">{item.dateStr}</span>
                      </div>
                      <div
                        className="text-xl font-black py-1 rounded-xl"
                        style={{ backgroundColor: cat.bgColor, color: cat.color }}
                      >
                        {Math.round(item.aqi)}
                      </div>
                      <AQIBadge aqi={item.aqi} size="sm" showIcon={false} />
                    </div>
                  );
                })}
          </div>
        </div>
      </FadeIn>
    </div>
  );
};
```

- [ ] **Bước 2: Kiểm tra biên dịch kiểu TypeScript**

Chạy:
```powershell
npx tsc --noEmit
```
Kết quả mong đợi: PASS với 0 lỗi.

- [ ] **Bước 3: Commit mã nguồn**

```bash
git add frontend/src/pages/Forecast.tsx
git commit -m "feat(fe): integrate Forecast page with real AQI API, skeletons, and 503 fallback"
```

---

### Nhiệm vụ 6: Kiểm thử Tích hợp & Kiểm tra Bản Build Cuối cùng

**Danh sách file:**
- Kiểm thử: Toàn bộ quá trình build và xác thực type

- [ ] **Bước 1: Chạy toàn bộ bài test phía Frontend**

Chạy:
```powershell
npx tsx --test frontend/tests/*.test.ts
```
Kết quả mong đợi: Toàn bộ các test PASS.

- [ ] **Bước 2: Chạy kiểm tra build production của Frontend**

Chạy:
```powershell
npm --prefix frontend run build
```
Kết quả mong đợi: Lệnh `vite build` hoàn thành thành công mà không có lỗi đóng gói tài nguyên.

- [ ] **Bước 3: Commit cuối cùng và hoàn tất**

```bash
git status
git commit -am "chore: complete FE-BE AQI forecast integration"
```
