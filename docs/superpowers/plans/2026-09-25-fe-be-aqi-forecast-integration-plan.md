# FE-BE AQI Forecast Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Connect the React frontend (`Forecast.tsx`) to the Express backend AQI forecast endpoints (`/api/air-quality/predict/daily`, `/hourly`, and `/health`), replacing static mock data with real AI predictions, loading skeletons, fault-tolerant 503 fallback handling, and strict data honesty.

**Architecture:** Layered frontend architecture:
1. **API Client Layer (`airquality.api.ts`):** Native `fetch` with `AbortSignal.timeout(8000)`, unwrapping the `{ success, data }` envelope and raising typed `AirQualityApiError`.
2. **Adapter Layer (`forecast.adapter.ts`):** Pure functions converting raw API responses into UI card models (`DisplayDailyCard`, `DisplayHourlyCard`), calculating localized day-of-week (`Thứ 2`, `Thứ 3`...), formatting 24h timestamps (`10:00`), and inferring missing `level` via `getAQICategory`.
3. **Custom Hook Layer (`useAirQualityForecast.ts`):** Manages concurrent fetching for daily & hourly forecast, tracks loading state, detects 503 ML service downtime, and provides a manual `refetch` function.
4. **Presentation Layer (`Forecast.tsx`):** Renders skeleton loaders when fetching, shows an amber alert banner when ML service is down (with a Retry button), plots a single clean AQI curve in Recharts without fake weather, and displays a note when non-Hanoi cities are selected.

**Tech Stack:** React 19, TypeScript 5.8, Vite 6, Tailwind CSS 4, Recharts 3, Lucide React, Node.js native test runner (`node:test`, `node:assert`, `tsx`).

**Spec:** [docs/superpowers/specs/2026-09-25-fe-be-aqi-forecast-integration-design.md](file:///C:/.Study%20at%20Home/.NCKH/NCKH/docs/superpowers/specs/2026-09-25-fe-be-aqi-forecast-integration-design.md)

---

## Global Constraints

- **Scientific Integrity (NCKH):** Never mock or fabricate weather parameters (`minTemp`, `maxTemp`, `condition`, `rainProbability`) or pollutant breakdowns (`pm25`, `pm10`) when the ML model only produces AQI. Remove or hide these unused fields.
- **Fault Tolerance:** If `ml-service` is unreachable or returns HTTP 503, the UI must not crash or display a blank page; it must render a user-friendly alert banner with a "Thử kết nối lại" (Retry) button.
- **Model Scope:** Current machine learning models are trained exclusively for Hanoi (`city: 'hanoi'`). When other cities are chosen in the dropdown, display an informational note explaining that AI predictions currently cover Hanoi only.
- **No Extra Network Dependencies:** Use native browser `fetch` (no Axios or TanStack Query required).
- **TypeScript Strictness:** All code must pass `npm run lint` (`tsc --noEmit`) with 0 errors.
- **Auth Exemption:** Endpoints under `/api/air-quality/*` do not require JWT authentication.

---

## Review Focus

1. **ML Service Unavailable (HTTP 503):** When the backend forwards 503 because `ml-service` is down, `airquality.api.ts` parses `body.message` into `AirQualityApiError(status=503)`, the hook sets `isMlServiceDown = true`, and the UI displays the amber alert banner.
2. **Nullable AQI Level Fallback:** If `ml-service` returns `level: null` in a forecast point, `forecast.adapter.ts` must infer the valid `AQILevel` using `getAQICategory(aqi).level`.
3. **Date & Day-of-Week Calculation:** Forecast `date` (e.g., `'2026-09-26'`) must produce correct Vietnamese day labels (`Thứ 7`, `Chủ Nhật`, etc.) and English abbreviations (`Sat`, `Sun`, etc.) regardless of client timezone.
4. **Timezone & Hourly Formatting:** Hourly `timestamp` (ISO string `2026-09-25T10:00:00Z`) must parse into clean `HH:mm` format (e.g. `10:00` or local equivalent) without `NaN:NaN`.
5. **Request Timeout:** Network requests exceeding 8 seconds must abort via `AbortSignal.timeout(8000)` and set a graceful error state rather than hanging indefinitely.

---

## File and Responsibility Map

- `frontend/.env.example`: defines `VITE_API_BASE_URL=http://localhost:3000/api`.
- `frontend/.env`: local developer environment variables.
- `frontend/src/types/airQuality.types.ts`: defines `RealDailyForecastPoint`, `RealHourlyForecastPoint`, response envelopes, and display card types.
- `frontend/src/services/apiClient/airquality.api.ts`: API client functions (`getDailyForecast`, `getHourlyForecast`, `checkAirQualityHealth`) and `AirQualityApiError`.
- `frontend/src/adapters/forecast.adapter.ts`: pure transformation functions mapping API models to UI card models and Recharts chart datasets.
- `frontend/src/hooks/useAirQualityForecast.ts`: custom React hook encapsulating state, loading, error, and retry logic.
- `frontend/src/pages/Forecast.tsx`: updated page view rendering skeletons, 503 banner, real 7-day ribbon, real 24-hour grid, and streamlined AQI chart.
- `frontend/tests/forecast.adapter.test.ts`: automated tests for adapter functions.
- `frontend/tests/airquality.api.test.ts`: automated tests for API client requests, timeout, and error handling.

---

### Task 1: Environment Configuration & Real Forecast Type Definitions

**Files:**
- Modify: `frontend/.env.example`
- Modify: `frontend/.env`
- Modify: `frontend/src/types/airQuality.types.ts`
- Test: `frontend/tests/types.test.ts`

**Interfaces:**
- Produces: `RealAQILevel`, `RealDailyForecastPoint`, `DailyForecastResponseData`, `RealHourlyForecastPoint`, `HourlyForecastResponseData`, `DisplayDailyCard`, `DisplayHourlyCard`.

- [ ] **Step 1: Write type assertion test**

Create `frontend/tests/types.test.ts`:

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

test('Type declarations validate required contract shapes', () => {
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

- [ ] **Step 2: Run test to verify it fails**

Run:
```powershell
npx tsx --test frontend/tests/types.test.ts
```
Expected: FAIL with missing type exports from `airQuality.types.ts`.

- [ ] **Step 3: Update `.env.example`, `.env`, and `airQuality.types.ts`**

Update `frontend/.env.example`:
```
VITE_API_BASE_URL=http://localhost:3000/api
```

Ensure `frontend/.env` has:
```
VITE_API_BASE_URL=http://localhost:3000/api
```

Append the new types to [frontend/src/types/airQuality.types.ts](file:///C:/.Study%20at%20Home/.NCKH/NCKH/frontend/src/types/airQuality.types.ts):

```typescript
// ── Types for REAL data from ML Service & Backend ──
export type RealAQILevel = AQILevel | null;

export interface RealDailyForecastPoint {
  date: string;       // Format 'YYYY-MM-DD'
  aqi: number;        // e.g. 132.4
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
  timestamp: string;  // ISO datetime string '2026-09-25T10:00:00Z'
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

- [ ] **Step 4: Run test to verify it passes**

Run:
```powershell
npx tsx --test frontend/tests/types.test.ts
```
Expected: PASS.

- [ ] **Step 5: Commit changes**

```bash
git add frontend/.env.example frontend/.env frontend/src/types/airQuality.types.ts frontend/tests/types.test.ts
git commit -m "feat(fe): add real ML forecast types and env config"
```

---

### Task 2: Implement Typed API Client with Timeout & Error Handling

**Files:**
- Modify: `frontend/src/services/apiClient/airquality.api.ts`
- Test: `frontend/tests/airquality.api.test.ts`

**Interfaces:**
- Consumes: `DailyForecastResponseData`, `HourlyForecastResponseData`.
- Produces: `airQualityApi.getDailyForecast(algo?: string)`, `airQualityApi.getHourlyForecast(algo?: string)`, `airQualityApi.checkMlServiceHealth()`, `AirQualityApiError`.

- [ ] **Step 1: Write API Client unit tests with mocked fetch**

Create `frontend/tests/airquality.api.test.ts`:

```typescript
import test from 'node:test';
import assert from 'node:assert/strict';
import { airQualityApi, AirQualityApiError } from '../src/services/apiClient/airquality.api';

test('airQualityApi.getDailyForecast unwraps envelope on success', async () => {
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

test('airQualityApi throws AirQualityApiError with status 503 when ML service is down', async () => {
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
        assert.match(err.message, /ml-service/);
        return true;
      }
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:
```powershell
npx tsx --test frontend/tests/airquality.api.test.ts
```
Expected: FAIL because `airQualityApi` is not yet implemented.

- [ ] **Step 3: Implement `frontend/src/services/apiClient/airquality.api.ts`**

Write implementation in [frontend/src/services/apiClient/airquality.api.ts](file:///C:/.Study%20at%20Home/.NCKH/NCKH/frontend/src/services/apiClient/airquality.api.ts):

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
      // Body may not be JSON
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

- [ ] **Step 4: Run test to verify it passes**

Run:
```powershell
npx tsx --test frontend/tests/airquality.api.test.ts
```
Expected: PASS.

- [ ] **Step 5: Commit changes**

```bash
git add frontend/src/services/apiClient/airquality.api.ts frontend/tests/airquality.api.test.ts
git commit -m "feat(fe): implement airquality API client with timeout and error handling"
```

---

### Task 3: Implement Data Adapter Layer for UI Presentation

**Files:**
- Create: `frontend/src/adapters/forecast.adapter.ts`
- Test: `frontend/tests/forecast.adapter.test.ts`

**Interfaces:**
- Consumes: `RealDailyForecastPoint[]`, `RealHourlyForecastPoint[]`.
- Produces: `toDisplayDailyCards(forecast, lang)`, `toDisplayHourlyCards(forecast)`, `toChartData(forecast, lang)`.

- [ ] **Step 1: Write adapter tests**

Create `frontend/tests/forecast.adapter.test.ts`:

```typescript
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  toDisplayDailyCards,
  toDisplayHourlyCards,
  toChartData,
  formatWeekday,
} from '../src/adapters/forecast.adapter';

test('formatWeekday returns correct Vietnamese and English weekday', () => {
  // 2026-09-26 is a Saturday
  const vi = formatWeekday('2026-09-26', 'vi');
  const en = formatWeekday('2026-09-26', 'en');
  assert.equal(vi, 'Thứ 7');
  assert.equal(en, 'Sat');
});

test('toDisplayDailyCards handles null level by falling back to getAQICategory', () => {
  const points = [
    { date: '2026-09-26', aqi: 45.0, level: null },
    { date: '2026-09-27', aqi: 155.0, level: 'unhealthy' as const },
  ];
  const cards = toDisplayDailyCards(points, 'vi');

  assert.equal(cards.length, 2);
  assert.equal(cards[0].level, 'good'); // 45 AQI is good
  assert.equal(cards[0].dayOfWeekVi, 'Thứ 7');
  assert.equal(cards[1].level, 'unhealthy');
});

test('toDisplayHourlyCards formats timestamps into HH:mm', () => {
  const points = [
    { timestamp: '2026-09-25T10:00:00Z', aqi: 90.0, level: null },
  ];
  const cards = toDisplayHourlyCards(points);
  assert.equal(cards.length, 1);
  assert.match(cards[0].timeStr, /^\d{2}:\d{2}$/);
  assert.equal(cards[0].level, 'moderate');
});

test('toChartData formats data for Recharts', () => {
  const points = [
    { date: '2026-09-26', aqi: 125.4, level: null },
  ];
  const chartData = toChartData(points, 'vi');
  assert.equal(chartData.length, 1);
  assert.equal(chartData[0].aqi, 125);
  assert.equal(chartData[0].dayOfWeek, 'Thứ 7');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:
```powershell
npx tsx --test frontend/tests/forecast.adapter.test.ts
```
Expected: FAIL because `forecast.adapter.ts` does not exist.

- [ ] **Step 3: Implement `frontend/src/adapters/forecast.adapter.ts`**

Create [frontend/src/adapters/forecast.adapter.ts](file:///C:/.Study%20at%20Home/.NCKH/NCKH/frontend/src/adapters/forecast.adapter.ts):

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
  // Use noon to avoid timezone boundary shifts
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

- [ ] **Step 4: Run test to verify it passes**

Run:
```powershell
npx tsx --test frontend/tests/forecast.adapter.test.ts
```
Expected: PASS.

- [ ] **Step 5: Commit changes**

```bash
git add frontend/src/adapters/forecast.adapter.ts frontend/tests/forecast.adapter.test.ts
git commit -m "feat(fe): implement forecast adapter layer for UI presentation"
```

---

### Task 4: Implement Custom React Hook `useAirQualityForecast`

**Files:**
- Create: `frontend/src/hooks/useAirQualityForecast.ts`

**Interfaces:**
- Consumes: `airQualityApi.getDailyForecast`, `airQualityApi.getHourlyForecast`, adapter functions.
- Produces: `useAirQualityForecast({ algo, lang }) -> { dailyCards, hourlyCards, chartData, isLoading, isMlServiceDown, error, refetch }`.

- [ ] **Step 1: Implement `useAirQualityForecast.ts`**

Create [frontend/src/hooks/useAirQualityForecast.ts](file:///C:/.Study%20at%20Home/.NCKH/NCKH/frontend/src/hooks/useAirQualityForecast.ts):

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

- [ ] **Step 2: Verify type check passes**

Run:
```powershell
npx tsc --noEmit
```
Expected: PASS with 0 errors.

- [ ] **Step 3: Commit changes**

```bash
git add frontend/src/hooks/useAirQualityForecast.ts
git commit -m "feat(fe): add useAirQualityForecast hook for lifecycle and error management"
```

---

### Task 5: Refactor `Forecast.tsx` with Skeletons, 503 Banner, & Honest Data Render

**Files:**
- Modify: `frontend/src/pages/Forecast.tsx`

**Interfaces:**
- Consumes: `useAirQualityForecast`, `getAQICategory`, `AQIBadge`.
- Produces: Complete production Forecast view connected to real API.

- [ ] **Step 1: Update `Forecast.tsx`**

Update [frontend/src/pages/Forecast.tsx](file:///C:/.Study%20at%20Home/.NCKH/NCKH/frontend/src/pages/Forecast.tsx) to:
1. Call `useAirQualityForecast({ algo: 'svr', lang })`.
2. Add a city notification banner if `selectedCity !== 'Hà Nội'`.
3. Add a warning banner when `isMlServiceDown || error` with a Retry button.
4. Render pulse skeleton cards when `isLoading`.
5. Render clean 7-day cards without fabricated temperature/weather blocks.
6. Render clean single-metric AQI `LineChart` in Recharts with gradient fill / clean lines.
7. Render 8 hourly cards (3-hour steps) with time, AQI, and AQI badge.

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

        {/* City Scope Notice if non-Hanoi is selected */}
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

        {/* Error / 503 Warning Banner */}
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

        {/* 7-Day Forecast Cards Ribbon */}
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

        {/* 7-Day Recharts AQI Chart */}
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

        {/* 24-Hour Detailed Breakdown */}
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

- [ ] **Step 2: Run linter/type check to ensure clean compilation**

Run:
```powershell
npx tsc --noEmit
```
Expected: PASS with 0 errors.

- [ ] **Step 3: Commit changes**

```bash
git add frontend/src/pages/Forecast.tsx
git commit -m "feat(fe): integrate Forecast page with real AQI API, skeletons, and 503 fallback"
```

---

### Task 6: End-to-End Build and Verification

**Files:**
- Test: Full build and type validation

- [ ] **Step 1: Run all tests in frontend**

Run:
```powershell
npx tsx --test frontend/tests/*.test.ts
```
Expected: All tests PASS.

- [ ] **Step 2: Run production build check**

Run:
```powershell
npm --prefix frontend run build
```
Expected: `vite build` finishes successfully without bundling or asset errors.

- [ ] **Step 3: Final commit and cleanup**

```bash
git status
git commit -am "chore: complete FE-BE AQI forecast integration"
```
