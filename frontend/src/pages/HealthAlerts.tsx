import React, { useState } from 'react';
import { AlertTriangle, ExternalLink, MapPin, RefreshCw, ShieldCheck } from 'lucide-react';
import { AQIBadge } from '../components/AQIBadge';
import { FadeIn } from '../components/FadeIn';
import { useLanguage } from '../context/LanguageContext';
import { CITIES, type CityCode, getCityName } from '../data/cities';
import { useAirQualityForecast } from '../hooks/useAirQualityForecast';
import { useHealthAdvice } from '../hooks/useHealthAdvice';
import { getAQICategory } from '../utils/aqi.util';

const riskLabel: Record<string, { vi: string; en: string }> = {
  low: { vi: 'Thấp', en: 'Low' },
  moderate: { vi: 'Trung bình', en: 'Moderate' },
  high: { vi: 'Cao', en: 'High' },
  critical: { vi: 'Rất cao', en: 'Critical' },
};

export const HealthAlerts: React.FC = () => {
  const { lang } = useLanguage();
  const [selectedCity, setSelectedCity] = useState<CityCode>('hanoi');
  const {
    allTopics,
    rotatesAt,
    isLoading: adviceLoading,
    error: adviceError,
    refetch: refetchAdvice,
  } = useHealthAdvice();
  const {
    dailyCards,
    hourlyCards,
    isLoading: forecastLoading,
    error: forecastError,
    refetch: refetchForecast,
  } = useAirQualityForecast({ city: selectedCity, lang });

  const selectedCityInfo = CITIES.find((city) => city.code === selectedCity)!;
  const peakHourly = hourlyCards.length
    ? hourlyCards.reduce((peak, point) => point.aqi > peak.aqi ? point : peak)
    : null;
  const peakDaily = dailyCards.length
    ? dailyCards.reduce((peak, point) => point.aqi > peak.aqi ? point : peak)
    : null;
  const peakForecast = peakHourly ?? peakDaily;
  const forecastCategory = peakForecast ? getAQICategory(peakForecast.aqi) : null;
  const forecastWindow = peakHourly
    ? (lang === 'vi' ? '24 giờ tới' : 'next 24 hours')
    : (lang === 'vi' ? '7 ngày tới' : 'next 7 days');
  const forecastTime = peakHourly
    ? `${peakHourly.timeStr} · ${peakHourly.dateStr}`
    : peakDaily?.date;
  const isLoading = adviceLoading || forecastLoading;

  const refreshAll = () => {
    void Promise.all([refetchAdvice(), refetchForecast()]);
  };

  return (
    <div className="w-full space-y-6 pb-20">
      <FadeIn direction="up">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
              <ShieldCheck className="h-4 w-4" />
              {lang === 'vi' ? 'Khuyến cáo sức khỏe' : 'Health advice'}
            </div>
            <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white sm:text-3xl">
              {lang === 'vi' ? 'Khuyến cáo sức khỏe theo thành phố' : 'City-level health advice'}
            </h1>
            <p className="mt-1 max-w-2xl text-xs leading-relaxed text-slate-500 dark:text-slate-400">
              {lang === 'vi'
                ? 'Khuyến cáo tổng quan được điều chỉnh theo AQI dự báo SVR của thành phố đã chọn. Các nội dung theo nhóm đối tượng bên dưới lấy từ cơ sở dữ liệu và có nguồn tham khảo.'
                : 'The summary advice follows the selected city’s SVR AQI forecast. Target-group guidance below comes from the database and includes references.'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
            <label className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2.5 shadow-sm dark:border-slate-700 dark:surface-card">
              <MapPin className="h-4 w-4 shrink-0 text-orange-500" />
              <span className="sr-only">{lang === 'vi' ? 'Chọn thành phố' : 'Choose a city'}</span>
              <select
                aria-label={lang === 'vi' ? 'Chọn thành phố' : 'Choose a city'}
                value={selectedCity}
                onChange={(event) => setSelectedCity(event.target.value as CityCode)}
                className="max-w-40 cursor-pointer bg-transparent text-xs font-bold text-slate-900 focus:outline-none dark:text-white"
              >
                {CITIES.map((city) => (
                  <option key={city.code} value={city.code} className="bg-white text-slate-900">
                    {getCityName(city, lang)}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              onClick={refreshAll}
              disabled={isLoading}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 hover:border-emerald-400 hover:text-emerald-700 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              {lang === 'vi' ? 'Tải lại' : 'Refresh'}
            </button>
          </div>
        </div>

        {forecastLoading && !peakForecast ? (
          <section className="mt-6 h-44 animate-pulse rounded-3xl border border-slate-200 bg-white dark:border-slate-800 dark:surface-card" />
        ) : peakForecast && forecastCategory ? (
          <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:surface-card sm:p-6" style={{ borderTopWidth: 4, borderTopColor: forecastCategory.color }}>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  {lang === 'vi' ? `AQI cao nhất dự báo trong ${forecastWindow}` : `Highest AQI forecast for the ${forecastWindow}`}
                </p>
                <h2 className="mt-1 text-lg font-black text-slate-900 dark:text-white">
                  {getCityName(selectedCityInfo, lang)}
                  {forecastTime ? <span className="ml-2 text-sm font-semibold text-slate-500 dark:text-slate-400">· {forecastTime}</span> : null}
                </h2>
              </div>
              <div className="flex items-center gap-3 self-start">
                <span className="text-4xl font-black" style={{ color: forecastCategory.color }}>
                  {Math.round(peakForecast.aqi)}
                </span>
                <AQIBadge aqi={peakForecast.aqi} size="md" />
              </div>
            </div>
            <p className="mt-4 text-sm font-semibold text-slate-800 dark:text-slate-200">
              {lang === 'vi' ? forecastCategory.descriptionVi : forecastCategory.descriptionEn}
            </p>
            <div className="mt-3 rounded-2xl px-4 py-3 text-sm leading-relaxed text-slate-800 dark:text-slate-100" style={{ backgroundColor: forecastCategory.bgColor }}>
              <span className="font-bold">{lang === 'vi' ? 'Khuyến cáo:' : 'Advice:'} </span>
              {lang === 'vi' ? forecastCategory.healthAdviceVi : forecastCategory.healthAdviceEn}
            </div>
            <p className="mt-3 text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">
              {lang === 'vi'
                ? 'Đây là khuyến cáo theo dự báo mô hình cho tọa độ đại diện của thành phố, không phải chỉ số đo trực tiếp tại trạm.'
                : 'This advice uses a model forecast for a representative city coordinate, not a direct monitoring-station reading.'}
            </p>
          </section>
        ) : (
          <section className="mt-6 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-900 dark:border-amber-900/70 dark:bg-amber-950/30 dark:text-amber-200">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
            <div>
              <p className="font-bold">{lang === 'vi' ? 'Chưa có dự báo cho thành phố này' : 'No forecast is available for this city'}</p>
              <p className="mt-1">{forecastError || (lang === 'vi' ? 'Tải dự báo AQI để xem khuyến cáo theo thành phố.' : 'Load the AQI forecast to see city-specific advice.')}</p>
            </div>
          </section>
        )}

        {adviceError && (
          <div className="mt-5 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-900 dark:border-amber-900/70 dark:bg-amber-950/30 dark:text-amber-200">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
            <div>
              <p className="font-bold">{lang === 'vi' ? 'Chưa tải được khuyến cáo theo nhóm' : 'Could not load target-group advice'}</p>
              <p className="mt-1">{adviceError}</p>
            </div>
          </div>
        )}

        {rotatesAt && (
          <p className="mt-4 text-[11px] text-slate-500">
            {lang === 'vi' ? 'Nội dung theo nhóm được xoay theo lịch, lần tiếp theo: ' : 'Target-group advice rotates on a schedule; next update: '}
            {new Date(rotatesAt).toLocaleString(lang === 'vi' ? 'vi-VN' : 'en-US', { timeZone: 'Asia/Ho_Chi_Minh' })}
          </p>
        )}

        <div className="mt-8">
          <h2 className="text-xl font-black text-slate-900 dark:text-white">
            {lang === 'vi' ? 'Khuyến cáo theo nhóm đối tượng' : 'Advice by target group'}
          </h2>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {lang === 'vi' ? 'Các hướng dẫn tham khảo chung cho từng nhóm sức khỏe.' : 'General reference guidance for different health groups.'}
          </p>
        </div>

        {adviceLoading && allTopics.length === 0 ? (
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="h-64 animate-pulse rounded-3xl border border-slate-200 bg-white dark:border-slate-800 dark:surface-card" />
            ))}
          </div>
        ) : allTopics.length > 0 ? (
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {allTopics.map((topic) => (
              <article key={topic.id} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:surface-card">
                <div className="flex items-start justify-between gap-3">
                  <h3 className="text-base font-black text-slate-900 dark:text-white">
                    {lang === 'vi' ? topic.titleVi : topic.titleEn || topic.titleVi}
                  </h3>
                  <span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                    {lang === 'vi' ? 'Rủi ro: ' : 'Risk: '}{riskLabel[topic.riskLevel]?.[lang] ?? topic.riskLevel}
                  </span>
                </div>

                <ul className="mt-4 space-y-2.5">
                  {topic.items.map((item) => (
                    <li key={item.id} className="flex gap-2.5 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
                      <span>{lang === 'vi' ? item.contentVi : item.contentEn || item.contentVi}</span>
                    </li>
                  ))}
                </ul>

                {topic.sources.length > 0 && (
                  <div className="mt-5 border-t border-slate-100 pt-3 dark:border-slate-800">
                    <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      {lang === 'vi' ? 'Nguồn tham khảo' : 'References'}
                    </p>
                    <ul className="space-y-1.5">
                      {topic.sources.map((source) => (
                        <li key={source.code}>
                          {source.url ? (
                            <a href={source.url} target="_blank" rel="noreferrer" className="inline-flex items-start gap-1.5 text-[11px] text-sky-700 hover:underline dark:text-sky-300">
                              <span>{source.title}{source.publisher ? ` · ${source.publisher}` : ''}{source.publishedYear ? ` (${source.publishedYear})` : ''}</span>
                              <ExternalLink className="mt-0.5 h-3 w-3 shrink-0" />
                            </a>
                          ) : (
                            <span className="text-[11px] text-slate-500">{source.title}{source.publisher ? ` · ${source.publisher}` : ''}</span>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </article>
            ))}
          </div>
        ) : !adviceError ? (
          <div className="mt-4 rounded-3xl border border-slate-200 bg-white p-6 text-sm text-slate-500 dark:border-slate-800 dark:surface-card">
            {lang === 'vi' ? 'Backend chưa có khuyến cáo sức khỏe để hiển thị.' : 'The backend has no health advice to display yet.'}
          </div>
        ) : null}
      </FadeIn>
    </div>
  );
};
