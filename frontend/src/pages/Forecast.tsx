import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { getAQICategory } from '../utils/aqi.util';
import { AQIBadge } from '../components/AQIBadge';
import { FadeIn } from '../components/FadeIn';
import { useAirQualityForecast } from '../hooks/useAirQualityForecast';
import { CITIES, getCityName } from '../data/cities';
import {
  MapPin,
  Clock,
  AlertTriangle,
  RefreshCw,
  Cpu,
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
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedCity = searchParams.get('city')?.toLowerCase();
  const selectedCity = CITIES.some((city) => city.code === requestedCity)
    ? requestedCity!
    : 'hanoi';

  const {
    dailyCards,
    hourlyCards,
    chartData,
    isLoading,
    isMlServiceDown,
    error,
    refetch,
  } = useAirQualityForecast({ algo: 'svr', city: selectedCity, lang });

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
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {lang === 'vi'
                ? 'Mô hình SVR sử dụng dữ liệu lịch sử Open-Meteo đã xử lý và lưu trong PostgreSQL.'
                : 'SVR models use processed historical Open-Meteo data stored in PostgreSQL.'}
            </p>
          </div>

          <div className="flex items-center gap-2 bg-white dark:surface-card border border-slate-200 surface-border p-1.5 rounded-2xl shadow-sm self-start sm:self-auto cursor-pointer">
            <MapPin className="w-4 h-4 text-orange-500 ml-2" />
            <select
              value={selectedCity}
              onChange={(e) => setSearchParams({ city: e.target.value }, { replace: true })}
              className="bg-transparent text-xs font-bold text-slate-900 dark:text-white focus:outline-none pr-3 cursor-pointer"
            >
              {CITIES.map((city) => (
                <option key={city.code} value={city.code} className="dark:bg-[var(--bg-card-header)]">
                  {getCityName(city, lang)}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-4 rounded-2xl border border-sky-200 bg-sky-50 p-3 text-xs leading-relaxed text-sky-950 dark:border-sky-900/70 dark:bg-sky-950/30 dark:text-sky-200">
          {lang === 'vi'
            ? 'Đây là giá trị dự báo AQI cho tọa độ đại diện của thành phố, không phải phép đo trực tiếp tại trạm quan trắc.'
            : 'These are AQI forecasts for representative city coordinates, not direct measurements from monitoring stations.'}
        </div>

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

        {/* 24-Hour Forecast Chart */}
        <div className="mt-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-xl dark:surface-card sm:p-8">
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-orange-500" />
              <div>
                <h3 className="text-lg font-black text-slate-900 dark:text-white">
                  {lang === 'vi' ? 'Biểu đồ AQI dự báo 24 giờ' : '24-Hour AQI Forecast'}
                </h3>
                <p className="text-xs text-slate-500">
                  {lang === 'vi' ? 'Diễn biến theo từng giờ, giờ Việt Nam' : 'Hourly trend in Vietnam time'}
                </p>
              </div>
            </div>
            {hourlyCards.length > 0 && (() => {
              const peak = hourlyCards.reduce((highest, point) => point.aqi > highest.aqi ? point : highest);
              return (
                <div className="flex items-center gap-2 self-start rounded-xl bg-orange-50 px-3 py-2 dark:bg-orange-950/30 sm:self-auto">
                  <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                    {lang === 'vi' ? 'Cao nhất' : 'Peak'} · {peak.timeStr} {peak.dateStr}
                  </span>
                  <AQIBadge aqi={peak.aqi} size="sm" showIcon={false} showNumber />
                </div>
              );
            })()}
          </div>

          <div className="h-72 w-full">
            {isLoading && hourlyCards.length === 0 ? (
              <div className="flex h-full w-full animate-pulse items-center justify-center rounded-2xl bg-slate-100 text-xs text-slate-400 dark:bg-slate-900">
                {lang === 'vi' ? 'Đang tải biểu đồ...' : 'Loading chart...'}
              </div>
            ) : hourlyCards.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={hourlyCards} margin={{ top: 16, right: 16, left: -16, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" opacity={0.35} vertical={false} />
                  <XAxis dataKey="timeStr" interval={2} stroke="#94A3B8" fontSize={10} tickLine={false} />
                  <YAxis stroke="#F97316" fontSize={11} tickLine={false} domain={[0, 'auto']} />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const point = payload[0].payload as { timeStr: string; dateStr: string; aqi: number };
                      return (
                        <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-lg dark:border-slate-700 dark:bg-slate-900">
                          <p className="text-xs font-bold text-slate-900 dark:text-white">
                            {lang === 'vi' ? 'Giờ' : 'Time'}: {point.timeStr} · {point.dateStr}
                          </p>
                          <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
                            AQI: <span className="font-bold text-orange-600 dark:text-orange-400">{Math.round(point.aqi)}</span>
                          </p>
                        </div>
                      );
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="aqi"
                    name="AQI"
                    stroke="#F97316"
                    strokeWidth={3}
                    dot={{ r: 3, fill: '#F97316' }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full w-full items-center justify-center rounded-2xl border border-dashed border-slate-200 text-center text-xs text-slate-500 dark:border-slate-700 dark:text-slate-400">
                {lang === 'vi' ? 'Chưa có dữ liệu dự báo theo giờ cho thành phố này.' : 'No hourly forecast is available for this city.'}
              </div>
            )}
          </div>
        </div>
      </FadeIn>
    </div>
  );
};
