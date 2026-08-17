import React, { useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { SEVEN_DAY_FORECAST, HOURLY_AQI_DATA_24H, VIETNAM_STATIONS } from '../data/mockAirData';
import { getAQICategory } from '../utils/aqi.util';
import { AQIBadge } from '../components/AQIBadge';
import { FadeIn } from '../components/FadeIn';
import {
  Calendar,
  CloudRain,
  Sun,
  Thermometer,
  Wind,
  Droplets,
  AlertCircle,
  Activity,
  CheckCircle2,
  MapPin,
  Clock
} from 'lucide-react';
import {
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend
} from 'recharts';

export const Forecast: React.FC = () => {
  const { lang, t } = useLanguage();
  const [selectedCity, setSelectedCity] = useState('Hà Nội');

  const cityOptions = ['Hà Nội', 'TP. Hồ Chí Minh', 'Đà Nẵng', 'Hải Phòng', 'Cần Thơ', 'Đà Lạt'];

  return (
    <div className="w-full space-y-12 pb-20">
      <FadeIn direction="up">
        {/* Header and City Selector */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              {lang === 'vi' ? 'Dự báo Chất lượng Không khí & Thời tiết 7 Ngày' : '7-Day Air Quality & Weather Forecast'}
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              {lang === 'vi'
                ? 'Mô hình dự báo tổ hợp dựa trên trạm quan trắc địa phương và vệ tinh khí quyển Copernicus CAMS'
                : 'Ensemble forecast models powered by local ground stations and Copernicus CAMS satellite atmospheric data'}
            </p>
          </div>

          <div className="flex items-center gap-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-1.5 rounded-2xl shadow-sm self-start sm:self-auto cursor-pointer">
            <MapPin className="w-4 h-4 text-orange-500 ml-2" />
            <select
              value={selectedCity}
              onChange={(e) => setSelectedCity(e.target.value)}
              className="bg-transparent text-xs font-bold text-slate-900 dark:text-white focus:outline-none pr-3 cursor-pointer"
            >
              {cityOptions.map((c) => (
                <option key={c} value={c} className="dark:bg-slate-900">
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* 7-Day Forecast Cards Ribbon */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-3.5 mt-8">
          {SEVEN_DAY_FORECAST.map((day, idx) => {
            const cat = getAQICategory(day.aqi);
            const isToday = idx === 0;
            return (
              <div
                key={day.id}
                className={`p-4 rounded-3xl border transition-all flex flex-col justify-between cursor-pointer hover:shadow-xl hover:-translate-y-1 ${
                  isToday
                    ? 'border-orange-500 bg-orange-50/40 dark:bg-orange-950/20 shadow-md ring-2 ring-orange-500/20'
                    : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-orange-400'
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

                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-xs space-y-1">
                  <div className="flex items-center justify-between font-bold">
                    <span className="text-red-500">{day.maxTemp}°</span>
                    <span className="text-slate-300">/</span>
                    <span className="text-sky-500">{day.minTemp}°C</span>
                  </div>
                  <div className="text-[10px] text-slate-500 line-clamp-1">
                    {lang === 'vi' ? day.conditionVi : day.conditionEn}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Combined Recharts Multi-layer Chart */}
        <div className="mt-8 p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {lang === 'vi' ? 'Biểu đồ Diễn biến AQI & Nhiệt độ 7 Ngày' : '7-Day AQI & Temperature Evolution Chart'}
              </h3>
              <p className="text-xs text-slate-500">
                So sánh xu hướng ô nhiễm không khí và dao động nhiệt độ ban ngày / ban đêm
              </p>
            </div>
          </div>

          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={SEVEN_DAY_FORECAST} margin={{ top: 20, right: 20, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.2} vertical={false} />
                <XAxis dataKey="dayOfWeekVi" stroke="#94A3B8" fontSize={11} tickLine={false} />
                <YAxis yAxisId="left" stroke="#F97316" fontSize={11} tickLine={false} />
                <YAxis yAxisId="right" orientation="right" stroke="#38BDF8" fontSize={11} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0F172A',
                    borderColor: '#334155',
                    borderRadius: '12px',
                    color: '#F8FAFC',
                    fontSize: '12px',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="aqi"
                  name="Chỉ số AQI VN"
                  stroke="#F97316"
                  strokeWidth={3}
                  dot={{ r: 5, fill: '#F97316' }}
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="maxTemp"
                  name="Nhiệt độ max (°C)"
                  stroke="#EF4444"
                  strokeWidth={2}
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="minTemp"
                  name="Nhiệt độ min (°C)"
                  stroke="#38BDF8"
                  strokeWidth={2}
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="rainProbability"
                  name="Khả năng mưa (%)"
                  stroke="#10B981"
                  strokeDasharray="3 3"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 24-Hour Detailed Breakdown Table */}
        <div className="mt-8 space-y-4">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-orange-500" />
            <h3 className="text-lg font-black text-slate-900 dark:text-white">
              {lang === 'vi' ? 'Dự báo chi tiết theo giờ trong ngày' : 'Detailed Hourly Forecast Breakdown'}
            </h3>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {HOURLY_AQI_DATA_24H.map((item, idx) => {
              const cat = getAQICategory(item.aqi);
              return (
                <div
                  key={idx}
                  className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm text-center space-y-2 cursor-pointer hover:shadow-md hover:-translate-y-0.5 hover:border-orange-400 transition-all"
                >
                  <span className="text-xs font-bold text-slate-500 block">{item.time}</span>
                  <div
                    className="text-2xl font-black py-1 rounded-xl"
                    style={{ backgroundColor: cat.bgColor, color: cat.color }}
                  >
                    {item.aqi}
                  </div>
                  <AQIBadge aqi={item.aqi} size="sm" showIcon={false} />
                  <div className="text-[11px] text-slate-500 pt-1 border-t border-slate-100 dark:border-slate-800 flex justify-between">
                    <span>{item.temperature}°C</span>
                    <span>{item.humidity}% ẩm</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </FadeIn>
    </div>
  );
};
