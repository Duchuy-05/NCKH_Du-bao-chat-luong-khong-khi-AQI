export type AQILevel = 'good' | 'moderate' | 'unhealthy_sensitive' | 'unhealthy' | 'very_unhealthy' | 'hazardous';

export interface AQICategoryInfo {
  level: AQILevel;
  min: number;
  max: number;
  labelVi: string;
  labelEn: string;
  color: string;
  bgColor: string;
  textColor: string;
  borderColor: string;
  descriptionVi: string;
  descriptionEn: string;
  healthAdviceVi: string;
  healthAdviceEn: string;
}

export type RealAQILevel = AQILevel | null;

export interface RealDailyForecastPoint {
  date: string;
  aqi: number;
  level?: RealAQILevel;
}

export interface DailyForecastResponseData {
  city: string;
  algo: string;
  generated_at: string;
  horizon_days: number;
  forecast: RealDailyForecastPoint[];
}

export interface CurrentAQIResponseData {
  city: string;
  aqi: number;
  level: string;
  dominant_pollutant?: string | null;
  as_of: string;
  generated_at: string;
  source: string;
}

export interface RealHourlyForecastPoint {
  timestamp: string;
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
  timeStr: string;
  dateStr: string;
  aqi: number;
  level: AQILevel;
}
