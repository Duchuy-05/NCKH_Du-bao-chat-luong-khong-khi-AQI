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
  city?: string;
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
  city = 'hanoi',
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
    setRawDaily(null);
    setRawHourly(null);
    setDailyCards([]);
    setHourlyCards([]);
    setChartData([]);

    try {
      const [dailyResult, hourlyResult] = await Promise.allSettled([
        airQualityApi.getDailyForecast(algo, city),
        airQualityApi.getHourlyForecast(algo, city),
      ]);

      const errors: string[] = [];
      let mlServiceDown = false;

      if (dailyResult.status === 'fulfilled') {
        setRawDaily(dailyResult.value);
        setDailyCards(toDisplayDailyCards(dailyResult.value.forecast, lang));
        setChartData(toChartData(dailyResult.value.forecast, lang));
      } else {
        const label = lang === 'vi' ? '7 ngày' : '7-day forecast';
        const message = dailyResult.reason instanceof Error
          ? dailyResult.reason.message
          : lang === 'vi' ? 'Không thể tải dự báo.' : 'Could not load forecast.';
        errors.push(`${label}: ${message}`);
        mlServiceDown ||= dailyResult.reason instanceof AirQualityApiError && dailyResult.reason.status === 503;
      }

      if (hourlyResult.status === 'fulfilled') {
        setRawHourly(hourlyResult.value);
        setHourlyCards(toDisplayHourlyCards(hourlyResult.value.forecast));
      } else {
        const label = lang === 'vi' ? '24 giờ' : '24-hour forecast';
        const message = hourlyResult.reason instanceof Error
          ? hourlyResult.reason.message
          : lang === 'vi' ? 'Không thể tải dự báo.' : 'Could not load forecast.';
        errors.push(`${label}: ${message}`);
        mlServiceDown ||= hourlyResult.reason instanceof AirQualityApiError && hourlyResult.reason.status === 503;
      }

      setIsMlServiceDown(mlServiceDown);
      setError(errors.length ? errors.join(' · ') : null);
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
  }, [algo, city, lang]);

  useEffect(() => {
    fetchData();
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
