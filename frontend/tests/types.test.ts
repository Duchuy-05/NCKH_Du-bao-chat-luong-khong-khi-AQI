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
