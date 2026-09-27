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
