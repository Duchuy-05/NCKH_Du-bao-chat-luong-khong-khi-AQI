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
