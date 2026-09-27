import React, { useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { getAQICategory } from '../utils/aqi.util';
import { AQIBadge } from '../components/AQIBadge';
import { FadeIn } from '../components/FadeIn';
import { useAirQualityForecast } from '../hooks/useAirQualityForecast';
import {
  MapPin,
  Clock,
  AlertTriangle,
  RefreshCw,
  Cpu,
  Info,
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
  const [selectedCity, setSelectedCity] = useState('Hà Nội');

  const {
    dailyCards,
    hourlyCards,
    chartData,
    isLoading,
    isMlServiceDown,
    error,
    refetch,
  } = useAirQualityForecast({ algo: 'svr', lang });

  const cityOptions = ['Hà Nội', 'TP. Hồ Chí Minh', 'Đà Nẵng', 'Hải Phòng', 'Cần Thơ', 'Đà Lạt'];
  const isHanoi = selectedCity === 'Hà Nội';

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
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-orange-100 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400 border border-orange-200 dark:border-orange-800">
                <Cpu className="w-3 h-3" />
                SVR Model
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {lang === 'vi'
                ? 'Mô hình học máy hồi quy vector hỗ trợ (SVR) kết hợp trạm quan trắc địa phương'
                : 'Support Vector Regression (SVR) model trained on local ground station atmospheric data'}
            </p>
          </div>

          <div className="flex items-center gap-2 bg-white dark:surface-card border border-slate-200 surface-border p-1.5 rounded-2xl shadow-sm self-start sm:self-auto cursor-pointer">
            <MapPin className="w-4 h-4 text-orange-500 ml-2" />
            <select
              value={selectedCity}
              onChange={(e) => setSelectedCity(e.target.value)}
              className="bg-transparent text-xs font-bold text-slate-900 dark:text-white focus:outline-none pr-3 cursor-pointer"
            >
              {cityOptions.map((c) => (
                <option key={c} value={c} className="dark:bg-[var(--bg-card-header)]">
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* City Scope Notice if non-Hanoi is selected */}
        {!isHanoi && (
          <div className="mt-4 p-4 rounded-2xl bg-sky-50 dark:bg-sky-950/20 border border-sky-200 dark:border-sky-800/40 flex items-start gap-3 text-sky-800 dark:text-sky-300 text-xs">
            <Info className="w-5 h-5 flex-shrink-0 text-sky-500 mt-0.5" />
            <div>
              <p className="font-bold">
                {lang === 'vi'
                  ? `Thông báo về trạm dự báo cho ${selectedCity}`
                  : `Forecast station notice for ${selectedCity}`}
              </p>
              <p className="mt-0.5 text-sky-700 dark:text-sky-400">
                {lang === 'vi'
                  ? 'Mô hình AI hiện tại được huấn luyện từ tập dữ liệu trạm quan trắc Hà Nội. Dữ liệu bên dưới phản ánh mô hình Hà Nội dùng cho mục đích tham khảo.'
                  : 'The AI model is currently trained on Hanoi monitoring stations. Data below reflects Hanoi predictions for reference.'}
              </p>
            </div>
          </div>
        )}

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

        {/* 24-Hour Detailed Breakdown */}
        <div className="mt-8 space-y-4">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-orange-500" />
            <h3 className="text-lg font-black text-slate-900 dark:text-white">
              {lang === 'vi' ? 'Dự báo chi tiết 24 giờ tới (bước nhảy 3h)' : '24-Hour Detailed Forecast (3h Steps)'}
            </h3>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
            {isLoading
              ? Array.from({ length: 8 }).map((_, idx) => (
                  <div
                    key={`skeleton-hourly-${idx}`}
                    className="p-4 rounded-2xl bg-white dark:surface-card border border-slate-200 surface-border animate-pulse h-28 flex flex-col justify-between"
                  >
                    <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded w-1/2 mx-auto"></div>
                    <div className="h-8 bg-slate-200 dark:bg-slate-800 rounded-xl my-1"></div>
                    <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded w-3/4 mx-auto"></div>
                  </div>
                ))
              : hourlyCards.map((item) => {
                  const cat = getAQICategory(item.aqi);
                  return (
                    <div
                      key={item.id}
                      className="p-3.5 rounded-2xl bg-white dark:surface-card border border-slate-200 surface-border shadow-sm text-center space-y-2 cursor-pointer hover:shadow-md hover:-translate-y-0.5 hover:border-orange-400 transition-all"
                    >
                      <div>
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">{item.timeStr}</span>
                        <span className="text-[10px] text-slate-400 block">{item.dateStr}</span>
                      </div>
                      <div
                        className="text-xl font-black py-1 rounded-xl"
                        style={{ backgroundColor: cat.bgColor, color: cat.color }}
                      >
                        {Math.round(item.aqi)}
                      </div>
                      <AQIBadge aqi={item.aqi} size="sm" showIcon={false} />
                    </div>
                  );
                })}
          </div>
        </div>
      </FadeIn>
    </div>
  );
};
