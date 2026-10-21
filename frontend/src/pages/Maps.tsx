import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, RefreshCw } from 'lucide-react';
import { AQIBadge } from '../components/AQIBadge';
import { CityForecastMap } from '../components/CityForecastMap';
import { FadeIn } from '../components/FadeIn';
import { useLanguage } from '../context/LanguageContext';
import { getCityName } from '../data/cities';
import { useCityForecasts } from '../hooks/useCityForecasts';
import { formatWeekday } from '../adapters/forecast.adapter';
import { getAQICategory } from '../utils/aqi.util';

function getVietnamDateKey(date: Date): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const year = parts.find((part) => part.type === 'year')?.value;
  const month = parts.find((part) => part.type === 'month')?.value;
  const day = parts.find((part) => part.type === 'day')?.value;
  return `${year}-${month}-${day}`;
}

function addOneDay(dateKey: string): string {
  const date = new Date(`${dateKey}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + 1);
  return date.toISOString().slice(0, 10);
}

function formatCurrentTime(value: string, lang: 'vi' | 'en'): string {
  return new Intl.DateTimeFormat(lang === 'vi' ? 'vi-VN' : 'en-GB', {
    timeZone: 'Asia/Ho_Chi_Minh',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

export const Maps: React.FC = () => {
  const { lang } = useLanguage();
  const { results, isLoading, refetch } = useCityForecasts();
  const [selectedCity, setSelectedCity] = useState('hanoi');
  const selected = results.find((result) => result.city.code === selectedCity) ?? results[0];
  const todayDate = getVietnamDateKey(new Date());
  const tomorrowDate = addOneDay(todayDate);
  const selectedTodayForecast = selected?.response?.forecast.find((point) => point.date === todayDate);
  const selectedUpcomingForecast = selected?.response?.forecast.filter((point) => point.date >= tomorrowDate) ?? [];

  return (
    <div className="w-full space-y-6 pb-20">
      <FadeIn direction="up">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white sm:text-3xl">
              {lang === 'vi' ? 'Bản đồ dự báo AQI theo thành phố' : 'City-level AQI forecast map'}
            </h1>
            <p className="mt-1 max-w-2xl text-xs leading-relaxed text-slate-500 dark:text-slate-400">
              {lang === 'vi'
                ? 'Bản đồ hiển thị AQI hiện tại tính từ Open-Meteo; dòng ngày mai và lịch các ngày tới lấy từ dự báo SVR.'
                : 'The map shows current AQI calculated from Open-Meteo; tomorrow and upcoming daily values come from the SVR forecast.'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => void refetch()}
            disabled={isLoading}
            className="inline-flex items-center justify-center gap-2 self-start rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 hover:border-orange-400 hover:text-orange-600 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 sm:self-auto"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            {lang === 'vi' ? 'Tải lại' : 'Refresh'}
          </button>
        </div>

        <div className="mt-4 rounded-2xl border border-sky-200 bg-sky-50 p-4 text-xs leading-relaxed text-sky-950 dark:border-sky-900/70 dark:bg-sky-950/30 dark:text-sky-200">
          {lang === 'vi'
            ? 'Các điểm trên bản đồ là tọa độ đại diện dùng để lấy dữ liệu Open-Meteo, không phải vị trí trạm quan trắc. Màu và số trên điểm là VN_AQI hiện tại tính từ nồng độ chất ô nhiễm Open-Meteo/CAMS.'
            : 'Markers use representative coordinates for Open-Meteo, not monitoring-station locations. Marker colors and values show current VN_AQI calculated from Open-Meteo/CAMS pollutant concentrations.'}
        </div>

        <div className="mt-6 grid items-start gap-6 lg:grid-cols-12">
          <div className="rounded-3xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:surface-card lg:col-span-7">
            {isLoading && results.length === 0 ? (
              <div className="mx-auto aspect-[4/5] w-full max-w-[520px] animate-pulse rounded-3xl bg-slate-100 dark:bg-slate-900" />
            ) : (
              <CityForecastMap
                results={results}
                selectedCity={selectedCity}
                onSelectCity={setSelectedCity}
                lang={lang}
              />
            )}
          </div>

          <aside className="space-y-4 lg:col-span-5">
            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:surface-card">
              <h2 className="text-base font-black text-slate-900 dark:text-white">
                {lang === 'vi' ? 'AQI hiện tại theo thành phố' : 'Current AQI by city'}
              </h2>
              <div className="mt-4 space-y-2">
                {results.map(({ city, response, currentAQI }) => {
                  const tomorrowPoint = response?.forecast.find((point) => point.date === tomorrowDate);
                  const tomorrowCategory = tomorrowPoint ? getAQICategory(tomorrowPoint.aqi) : null;
                  return (
                    <button
                      key={city.code}
                      type="button"
                      onClick={() => setSelectedCity(city.code)}
                      className={`flex w-full items-center justify-between gap-3 rounded-2xl border p-3 text-left transition ${selectedCity === city.code ? 'border-orange-400 bg-orange-50/70 dark:bg-orange-950/20' : 'border-slate-100 bg-slate-50 hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900/60 dark:hover:border-slate-700'}`}
                    >
                      <div>
                        <span className="text-sm font-bold text-slate-900 dark:text-white">{getCityName(city, lang)}</span>
                        <span className="mt-0.5 block text-[10px] text-slate-500">
                          {currentAQI
                            ? `${lang === 'vi' ? 'Cập nhật lúc' : 'Updated'} ${formatCurrentTime(currentAQI.as_of, lang)}`
                            : lang === 'vi' ? 'Chưa có AQI hiện tại' : 'Current AQI unavailable'}
                        </span>
                        {tomorrowPoint && (
                          <span
                            className="mt-1 block text-[10px] font-semibold text-slate-600 dark:text-slate-300"
                            style={tomorrowCategory ? { color: tomorrowCategory.color } : undefined}
                          >
                            {lang === 'vi' ? 'Ngày mai' : 'Tomorrow'} · AQI {Math.round(tomorrowPoint.aqi)}
                          </span>
                        )}
                      </div>
                      <span
                        className="text-lg font-black"
                        style={{ color: currentAQI ? getAQICategory(currentAQI.aqi).color : undefined }}
                      >
                        {currentAQI ? Math.round(currentAQI.aqi) : '—'}
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>

            {selected && (
              <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:surface-card">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      {lang === 'vi' ? 'AQI hiện tại' : 'Current AQI'}
                    </p>
                    <h2 className="mt-1 text-lg font-black text-slate-900 dark:text-white">
                      {getCityName(selected.city, lang)}
                    </h2>
                  </div>
                  {selected.currentAQI && (
                    <AQIBadge aqi={selected.currentAQI.aqi} size="sm" />
                  )}
                </div>
                {selected.currentAQI ? (
                  <div className="mt-3 flex items-end justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
                    <span className="text-4xl font-black" style={{ color: getAQICategory(selected.currentAQI.aqi).color }}>
                      {Math.round(selected.currentAQI.aqi)}
                    </span>
                    <span className="text-right text-[10px] text-slate-500">
                      {lang === 'vi' ? 'Cập nhật lúc' : 'Updated'}<br />
                      <strong className="text-slate-700 dark:text-slate-200">
                        {formatCurrentTime(selected.currentAQI.as_of, lang)}
                      </strong>
                    </span>
                  </div>
                ) : (
                  <p className="mt-3 rounded-xl bg-slate-50 p-3 text-xs text-slate-500 dark:bg-slate-900 dark:text-slate-400">
                    {isLoading
                      ? (lang === 'vi' ? 'Đang tải AQI hiện tại…' : 'Loading current AQI…')
                      : selected.currentAQIError || (lang === 'vi' ? 'Chưa có dữ liệu AQI hiện tại.' : 'Current AQI unavailable.')}
                  </p>
                )}
                <div className="mt-3 flex items-center justify-between gap-3 rounded-2xl border border-sky-100 bg-sky-50/70 px-3 py-2.5 dark:border-sky-900/60 dark:bg-sky-950/20">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-sky-800 dark:text-sky-300">
                      {lang === 'vi' ? 'AQI hôm nay' : "Today's AQI"}
                    </p>
                  </div>
                  {selectedTodayForecast ? (
                    <span
                      className="shrink-0 text-lg font-black"
                      style={{ color: getAQICategory(selectedTodayForecast.aqi).color }}
                    >
                      AQI {Math.round(selectedTodayForecast.aqi)}
                    </span>
                  ) : (
                    <span className="shrink-0 text-xs font-bold text-slate-400">
                      {isLoading
                        ? '…'
                        : selected.error
                          ? (lang === 'vi' ? 'Lỗi tải' : 'Unavailable')
                          : (lang === 'vi' ? 'Chưa có' : 'Unavailable')}
                    </span>
                  )}
                </div>
                <div className="mt-3">
                  <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    {lang === 'vi' ? 'Dự báo từ ngày mai' : 'Forecast starting tomorrow'}
                  </p>
                  {selectedUpcomingForecast.length ? (
                    <div className="divide-y divide-slate-100 dark:divide-slate-800">
                      {selectedUpcomingForecast.map((point) => (
                      <div key={point.date} className="flex items-center justify-between py-2 text-xs">
                        <span className="text-slate-600 dark:text-slate-300">
                          {formatWeekday(point.date, lang)} · {point.date}
                        </span>
                        <span className="font-black text-slate-900 dark:text-white">AQI {Math.round(point.aqi)}</span>
                      </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs leading-relaxed text-slate-500">
                      {isLoading ? (lang === 'vi' ? 'Đang tải dự báo…' : 'Loading forecast…') : selected.error || (lang === 'vi' ? 'Chưa có dự báo SVR cho các ngày sắp tới.' : 'No SVR forecast is available for upcoming days.')}
                    </p>
                  )}
                </div>
                <Link
                  to={`/forecast?city=${selected.city.code}`}
                  className="mt-4 inline-flex items-center gap-2 text-xs font-bold text-orange-600 hover:text-orange-700 dark:text-orange-400"
                >
                  {lang === 'vi' ? 'Mở dự báo 24 giờ và 7 ngày' : 'Open 24-hour and 7-day forecast'}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </section>
            )}
          </aside>
        </div>
      </FadeIn>
    </div>
  );
};
