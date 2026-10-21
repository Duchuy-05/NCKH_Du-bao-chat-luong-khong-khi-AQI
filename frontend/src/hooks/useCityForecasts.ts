import { useCallback, useEffect, useState } from 'react';
import { airQualityApi } from '../services/apiClient/airquality.api';
import type { CurrentAQIResponseData, DailyForecastResponseData } from '../types/airQuality.types';
import { CITIES, type CityInfo } from '../data/cities';

export interface CityForecastResult {
  city: CityInfo;
  response: DailyForecastResponseData | null;
  error: string | null;
  currentAQI: CurrentAQIResponseData | null;
  currentAQIError: string | null;
}

export function useCityForecasts() {
  const [results, setResults] = useState<CityForecastResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refetch = useCallback(async () => {
    setIsLoading(true);
    const nextResults = await Promise.all(
      CITIES.map(async (city): Promise<CityForecastResult> => {
        const [dailyResult, currentResult] = await Promise.allSettled([
          airQualityApi.getDailyForecast('svr', city.code),
          airQualityApi.getCurrentAQI(city.code),
        ]);
        return {
          city,
          response: dailyResult.status === 'fulfilled' ? dailyResult.value : null,
          error: dailyResult.status === 'rejected'
            ? dailyResult.reason instanceof Error ? dailyResult.reason.message : 'Không thể tải dự báo.'
            : null,
          currentAQI: currentResult.status === 'fulfilled' ? currentResult.value : null,
          currentAQIError: currentResult.status === 'rejected'
            ? currentResult.reason instanceof Error ? currentResult.reason.message : 'Không thể tải AQI hiện tại.'
            : null,
        };
      })
    );
    setResults(nextResults);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  return { results, isLoading, refetch };
}
