import React from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, ArrowRight, Map, RefreshCw } from 'lucide-react';
import { FadeIn } from '../components/FadeIn';
import { useLanguage } from '../context/LanguageContext';
import { useCityForecasts } from '../hooks/useCityForecasts';
import { getCityName } from '../data/cities';
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

export const Home: React.FC = () => {
  const { lang } = useLanguage();
  const { results, isLoading, refetch } = useCityForecasts();
  const tomorrowDate = addOneDay(getVietnamDateKey(new Date()));

  return (
    <div className="w-full space-y-8 pb-20">
      <FadeIn direction="up">
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:surface-card sm:p-9">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div className="max-w-3xl">
              <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white sm:text-4xl">
                {lang === 'vi' ? 'Chất lượng không khí các thành phố lớn ở Việt Nam' : 'Air quality in Vietnam'}
              </h1>
            </div>
            <button
              type="button"
              onClick={() => void refetch()}
              disabled={isLoading}
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-bold text-slate-700 transition hover:border-orange-400 hover:text-orange-600 disabled:cursor-wait disabled:opacity-60 dark:border-slate-700 dark:text-slate-200"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              {lang === 'vi' ? 'Tải lại dữ liệu' : 'Refresh data'}
            </button>
          </div>
        </section>

        <section className="mt-5 flex gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-950 dark:border-amber-900/70 dark:bg-amber-950/30 dark:text-amber-200">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
          <div className="text-xs leading-relaxed">
            <p className="font-bold">
              {lang === 'vi' ? 'Nguồn và phạm vi dữ liệu' : 'Data sources and coverage'}
            </p>
            <p className="mt-1">
              {lang === 'vi'
                  ? 'AQI hiện tại được tính theo VN_AQI từ nồng độ chất ô nhiễm Open-Meteo/CAMS tại tọa độ đại diện (chuỗi CAMS 3 giờ được nội suy về bước 1 giờ). Mô hình dư báo AQI dụa trên dữ liệu được cung cấp từ Open-Meteo. Đây đều là giá trị mô hình, không phải số đo trực tiếp từ trạm quan trắc.'
                  : 'Current AQI is calculated using VN_AQI from Open-Meteo/CAMS pollutant concentrations at representative city coordinates (the 3-hour CAMS series is interpolated to hourly steps). The AQI forecast model is based on data provided by Open-Meteo. These are model-generated values, not direct measurements from monitoring stations.'}
            </p>
          </div>
        </section>

        <section className="mt-8">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-xl font-black text-slate-900 dark:text-white">
                {lang === 'vi' ? 'Dự báo theo thành phố' : 'Forecast by city'}
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                {lang === 'vi'
                  ? 'AQI hiện tại tính từ dữ liệu Open-Meteo; ngày mai lấy từ dự báo SVR.'
                  : 'Current AQI is calculated from Open-Meteo data; tomorrow uses the SVR forecast.'}
              </p>
            </div>
            <Link
              to="/maps"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-orange-600 hover:text-orange-700 dark:text-orange-400"
            >
              <Map className="h-4 w-4" />
              {lang === 'vi' ? 'Xem sơ đồ thành phố' : 'View city map'}
            </Link>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
            {isLoading && results.length === 0
              ? Array.from({ length: 5 }).map((_, index) => (
                  <div key={index} className="h-52 animate-pulse rounded-3xl border border-slate-200 bg-white dark:border-slate-800 dark:surface-card" />
                ))
              : results.map(({ city, response, error, currentAQI, currentAQIError }) => {
                  const tomorrowPoint = response?.forecast.find((point) => point.date === tomorrowDate);
                  const currentCategory = currentAQI ? getAQICategory(currentAQI.aqi) : null;
                  const tomorrowCategory = tomorrowPoint ? getAQICategory(tomorrowPoint.aqi) : null;
                  return (
                    <Link
                      key={city.code}
                      to={`/forecast?city=${city.code}`}
                      className="group rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:border-orange-400 hover:shadow-lg dark:border-slate-800 dark:surface-card"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h3 className="text-base font-black text-slate-900 dark:text-white">
                            {getCityName(city, lang)}
                          </h3>
                        </div>
                        <ArrowRight className="h-4 w-4 text-slate-400 transition group-hover:translate-x-1 group-hover:text-orange-500" />
                      </div>

                      <div className="mt-5">
                        {currentAQI && currentCategory ? (
                          <div className="flex items-end justify-between gap-2">
                            <div>
                              <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                                {lang === 'vi' ? 'AQI hiện tại' : 'Current AQI'}
                              </p>
                              <div className="mt-0.5 text-4xl font-black" style={{ color: currentCategory.color }}>
                                {Math.round(currentAQI.aqi)}
                              </div>
                            </div>
                            <div className="text-right text-[10px] text-slate-500">
                              {lang === 'vi' ? 'Cập nhật lúc' : 'Updated'}<br />
                              <span className="font-bold text-slate-700 dark:text-slate-200">
                                {new Intl.DateTimeFormat(lang === 'vi' ? 'vi-VN' : 'en-GB', {
                                  timeZone: 'Asia/Ho_Chi_Minh', hour: '2-digit', minute: '2-digit',
                                }).format(new Date(currentAQI.as_of))}
                              </span>
                            </div>
                          </div>
                        ) : (
                          <div className="rounded-2xl bg-slate-50 p-3 text-xs leading-relaxed text-slate-500 dark:bg-slate-900 dark:text-slate-400">
                            {isLoading
                              ? (lang === 'vi' ? 'Đang tải AQI hiện tại…' : 'Loading current AQI…')
                              : currentAQIError
                                ? (lang === 'vi' ? `Không tải được AQI hiện tại: ${currentAQIError}` : `Could not load current AQI: ${currentAQIError}`)
                                : (lang === 'vi' ? 'Chưa có dữ liệu AQI hiện tại.' : 'Current AQI unavailable.')}
                          </div>
                        )}
                        {tomorrowPoint && tomorrowCategory ? (
                          <div className="mt-2 flex items-center justify-between border-t border-slate-100 pt-2.5 text-xs dark:border-slate-800">
                            <span className="text-slate-500 dark:text-slate-400">
                              {lang === 'vi' ? 'Ngày mai' : 'Tomorrow'}
                            </span>
                            <span className="font-bold" style={{ color: tomorrowCategory.color }}>
                              {Math.round(tomorrowPoint.aqi)}
                            </span>
                          </div>
                        ) : (
                          <div className="mt-2 border-t border-slate-100 pt-2.5 text-[11px] text-slate-500 dark:border-slate-800">
                            {isLoading
                              ? (lang === 'vi' ? 'Đang tải dự báo ngày mai…' : 'Loading tomorrow’s forecast…')
                              : error
                                ? (lang === 'vi' ? `Không tải được dự báo: ${error}` : `Could not load forecast: ${error}`)
                                : (lang === 'vi' ? 'Chưa có dự báo ngày mai; có thể mô hình SVR chưa được huấn luyện.' : 'Tomorrow’s forecast is unavailable; the city SVR model may not be trained yet.')}
                          </div>
                        )}
                      </div>
                    </Link>
                  );
                })}
          </div>
        </section>

        <section className="mt-8 grid gap-4 md:grid-cols-2">
          <Link to="/forecast" className="rounded-3xl bg-slate-900 p-6 text-white shadow-lg transition hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700">
            <h2 className="text-lg font-black">{lang === 'vi' ? 'Dự báo chi tiết' : 'Detailed forecast'}</h2>
            <p className="mt-2 text-xs leading-relaxed text-slate-300">
              {lang === 'vi' ? 'Xem dự báo SVR 7 ngày và 24 giờ theo từng thành phố.' : 'View SVR 7-day and 24-hour forecasts by city.'}
            </p>
            <span className="mt-4 inline-flex items-center gap-2 text-xs font-bold text-orange-300">
              {lang === 'vi' ? 'Mở dự báo' : 'Open forecast'} <ArrowRight className="h-4 w-4" />
            </span>
          </Link>
          <Link to="/alerts" className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition hover:border-sky-400 dark:border-slate-800 dark:surface-card">
            <h2 className="text-lg font-black text-slate-900 dark:text-white">
              {lang === 'vi' ? 'Khuyến cáo sức khỏe' : 'Health advice'}
            </h2>
            <p className="mt-2 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
              {lang === 'vi' ? 'Nội dung được backend tải từ cơ sở dữ liệu và gắn với nguồn tham khảo.' : 'Advice loaded by the backend from the database with linked references.'}
            </p>
            <span className="mt-4 inline-flex items-center gap-2 text-xs font-bold text-sky-600 dark:text-sky-400">
              {lang === 'vi' ? 'Xem khuyến cáo' : 'Read advice'} <ArrowRight className="h-4 w-4" />
            </span>
          </Link>
        </section>
      </FadeIn>
    </div>
  );
};
