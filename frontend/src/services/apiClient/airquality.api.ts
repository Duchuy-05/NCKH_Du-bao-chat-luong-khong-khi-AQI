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
