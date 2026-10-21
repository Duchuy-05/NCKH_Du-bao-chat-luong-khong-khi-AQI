import type {
  RealDailyForecastPoint,
  RealHourlyForecastPoint,
  DisplayDailyCard,
  DisplayHourlyCard,
  AQILevel,
} from '../types/airQuality.types';
export type { DisplayDailyCard, DisplayHourlyCard };

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
    const parts = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Ho_Chi_Minh',
      hour: '2-digit',
      minute: '2-digit',
      day: '2-digit',
      month: '2-digit',
      hourCycle: 'h23',
    }).formatToParts(new Date(point.timestamp));
    const getPart = (type: string) => parts.find((part) => part.type === type)?.value ?? '00';
    const hours = getPart('hour');
    const minutes = getPart('minute');
    const day = getPart('day');
    const month = getPart('month');

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
