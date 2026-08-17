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

export interface PollutantDetail {
  value: number;
  unit: string;
  status: 'good' | 'moderate' | 'unhealthy';
  trend: 'up' | 'down' | 'stable';
  changePercent: number;
  maxSafe: number;
}

export interface Pollutants {
  pm25: PollutantDetail;
  pm10: PollutantDetail;
  o3: PollutantDetail;
  no2: PollutantDetail;
  so2: PollutantDetail;
  co: PollutantDetail;
}

export interface WeatherData {
  temperature: number;
  feelsLike: number;
  humidity: number;
  windSpeed: number;
  windDirection: string;
  uvIndex: number;
  pressure: number;
  visibility: number;
  conditionVi: string;
  conditionEn: string;
  icon: string;
}

export interface AirStation {
  id: string;
  name: string;
  province: string;
  region: 'Bac' | 'Trung' | 'Nam';
  aqi: number;
  level: AQILevel;
  primaryPollutant: string;
  temperature: number;
  humidity: number;
  windSpeed: number;
  lastUpdated: string;
  lat: number;
  lng: number;
  mapX: number; // SVG % coordinate
  mapY: number; // SVG % coordinate
  address: string;
  pollutants: Pollutants;
}

export interface HourlyAQI {
  hour: string;
  time: string;
  aqi: number;
  pm25: number;
  pm10: number;
  temperature: number;
  humidity: number;
  level: AQILevel;
}

export interface DailyForecast {
  id: string;
  dayOfWeekVi: string;
  dayOfWeekEn: string;
  date: string;
  location: string;
  province: string;
  aqi: number;
  level: AQILevel;
  minTemp: number;
  maxTemp: number;
  conditionVi: string;
  conditionEn: string;
  dominantPollutant: string;
  rainProbability: number;
}

export interface HealthAdviceGroup {
  id: string;
  titleVi: string;
  titleEn: string;
  icon: string;
  riskLevel: 'low' | 'moderate' | 'high' | 'critical';
  adviceVi: string[];
  adviceEn: string[];
}

export interface ActiveAlert {
  id: string;
  titleVi: string;
  titleEn: string;
  locationVi: string;
  locationEn: string;
  severity: 'warning' | 'danger' | 'emergency';
  aqi: number;
  timestamp: string;
  descriptionVi: string;
  descriptionEn: string;
  actionItemsVi: string[];
  actionItemsEn: string[];
}

export interface NotificationPreferences {
  enabled: boolean;
  threshold: number;
  location: string;
  sound: boolean;
  dailySummary: boolean;
  summaryTime: string;
}
