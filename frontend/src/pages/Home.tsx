import React, { useState, useMemo } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { useNotification } from '../context/NotificationContext';
import { VIETNAM_STATIONS, HOURLY_AQI_DATA_24H, SEVEN_DAY_FORECAST, HEALTH_GROUPS_ADVICE, BEST_OUTDOOR_HOURS, CITY_COMPARISONS, INDOOR_AIR_TIPS } from '../data/mockAirData';
import { AirStation, DailyForecast, PollutantDetail } from '../types/airQuality.types';
import { getAQICategory } from '../utils/aqi.util';
import { formatDateTime } from '../utils/date.util';
import { AQIBadge } from '../components/AQIBadge';
import { VietnamMap } from '../components/VietnamMap';
import { FadeIn } from '../components/FadeIn';
import {
  Search,
  Navigation,
  Wind,
  Thermometer,
  Droplets,
  Sun,
  Eye,
  Gauge,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Bell,
  BellRing,
  Activity,
  HeartPulse,
  Baby,
  Bike,
  CheckCircle2,
  AlertTriangle,
  Sliders,
  Sparkles,
  MapPin,
  Clock,
  ChevronRight,
  Layers,
  Leaf
} from 'lucide-react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Cell
} from 'recharts';

interface HomeProps {
  onSelectStation: (station: AirStation) => void;
  onNavigateToMaps: () => void;
  onNavigateToForecast: () => void;
  onNavigateToAlerts: () => void;
}

export const Home: React.FC<HomeProps> = ({
  onSelectStation,
  onNavigateToMaps,
  onNavigateToForecast,
  onNavigateToAlerts,
}) => {
  const { lang, t } = useLanguage();
  const { preferences, updatePreferences, requestBrowserPermission, sendSimulatedAlert } = useNotification();

  // Current active station selected for hero display
  const [currentStation, setCurrentStation] = useState<AirStation>(VIETNAM_STATIONS[0]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [locatingStatus, setLocatingStatus] = useState<string | null>(null);

  // Visual charts tab
  const [chartTab, setChartTab] = useState<'24h' | 'pollutants' | 'temp'>('24h');

  // Forecast table filter
  const [selectedProvinceFilter, setSelectedProvinceFilter] = useState<string>('All');

  // Notification threshold slider local state
  const [customThreshold, setCustomThreshold] = useState<number>(preferences.threshold);

  const category = getAQICategory(currentStation.aqi);

  // Filtered search list
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase();
    return VIETNAM_STATIONS.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.province.toLowerCase().includes(q) ||
        s.address.toLowerCase().includes(q)
    );
  }, [searchQuery]);

  // Geolocation trigger
  const handleDetectLocation = () => {
    setIsLocating(true);
    setLocatingStatus(t('hero.locating'));

    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setIsLocating(false);
          setLocatingStatus(t('hero.location_detected'));
          // Select closest realistic station (Hanoi Hoan Kiem or HCMC Ben Thanh depending on user or default)
          const target = VIETNAM_STATIONS[0];
          setCurrentStation(target);
          setTimeout(() => setLocatingStatus(null), 3000);
        },
        (err) => {
          setIsLocating(false);
          // Fallback graceful simulation
          setLocatingStatus(lang === 'vi' ? 'Đã chọn vị trí gần nhất: ' + currentStation.province : 'Selected nearest: ' + currentStation.province);
          setTimeout(() => setLocatingStatus(null), 3000);
        },
        { timeout: 5000 }
      );
    } else {
      setIsLocating(false);
      setLocatingStatus(lang === 'vi' ? 'Vị trí hiện tại: ' + currentStation.province : 'Current location: ' + currentStation.province);
      setTimeout(() => setLocatingStatus(null), 3000);
    }
  };

  const handleSaveNotificationConfig = async () => {
    updatePreferences({ threshold: customThreshold });
    if (!preferences.enabled) {
      await requestBrowserPermission();
    } else {
      sendSimulatedAlert(
        'AirVision VN: Cập nhật ngưỡng',
        `Bạn sẽ nhận thông báo khi AQI vượt mức ${customThreshold}.`,
        customThreshold
      );
    }
  };

  const pollutantDataForBarChart = useMemo(() => {
    return [
      { name: 'PM2.5', value: currentStation.pollutants.pm25.value, safe: currentStation.pollutants.pm25.maxSafe, unit: 'µg/m³' },
      { name: 'PM10', value: currentStation.pollutants.pm10.value, safe: currentStation.pollutants.pm10.maxSafe, unit: 'µg/m³' },
      { name: 'O3', value: currentStation.pollutants.o3.value, safe: currentStation.pollutants.o3.maxSafe, unit: 'ppb' },
      { name: 'NO2', value: currentStation.pollutants.no2.value, safe: currentStation.pollutants.no2.maxSafe, unit: 'ppb' },
      { name: 'SO2', value: currentStation.pollutants.so2.value, safe: currentStation.pollutants.so2.maxSafe, unit: 'ppb' },
      { name: 'CO', value: currentStation.pollutants.co.value * 10, safe: currentStation.pollutants.co.maxSafe * 10, unit: '0.1mg/m³' },
    ];
  }, [currentStation]);

  const uniqueProvinces = useMemo(() => {
    const list = Array.from(new Set(SEVEN_DAY_FORECAST.map((f) => f.province)));
    return ['All', ...list];
  }, []);

  const filteredForecast = useMemo(() => {
    if (selectedProvinceFilter === 'All') return SEVEN_DAY_FORECAST;
    return SEVEN_DAY_FORECAST.filter((f) => f.province === selectedProvinceFilter);
  }, [selectedProvinceFilter]);

  const getHealthGroupIcon = (icon: string) => {
    switch (icon) {
      case 'Baby':
        return <Baby className="w-5 h-5" />;
      case 'HeartPulse':
        return <HeartPulse className="w-5 h-5" />;
      case 'Activity':
        return <Activity className="w-5 h-5" />;
      case 'Bike':
        return <Bike className="w-5 h-5" />;
      default:
        return <HeartPulse className="w-5 h-5" />;
    }
  };

  return (
    <div className="w-full space-y-16 pb-20">
      {/* 1. HERO SECTION */}
      <section className="relative pt-6 sm:pt-10">
        <FadeIn direction="up">
          {/* Search and Location Bar */}
          <div className="max-w-4xl mx-auto mb-8">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
              {/* Search Input with Autocomplete */}
              <div className="relative flex-1">
                <Search className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onFocus={() => setIsSearching(true)}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setIsSearching(true);
                  }}
                  placeholder={t('hero.search_placeholder')}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl pl-12 pr-4 py-3.5 text-sm text-slate-900 dark:text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all placeholder-slate-400"
                />

                {/* Autocomplete Dropdown */}
                {isSearching && searchResults.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl z-50 max-h-72 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
                    {searchResults.map((st) => (
                      <div
                        key={st.id}
                        onClick={() => {
                          setCurrentStation(st);
                          setIsSearching(false);
                          setSearchQuery('');
                        }}
                        className="p-3.5 hover:bg-slate-50 dark:hover:bg-slate-800/80 cursor-pointer flex items-center justify-between transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                            <MapPin className="w-4 h-4 text-orange-500" />
                          </div>
                          <div>
                            <p className="text-xs font-bold text-slate-900 dark:text-white">{st.name}</p>
                            <p className="text-[11px] text-slate-500">{st.province} • {st.address}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <AQIBadge aqi={st.aqi} size="sm" />
                          <span className="text-xs font-bold">{Math.round(st.aqi)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Geolocation Button */}
              <button
                onClick={handleDetectLocation}
                disabled={isLocating}
                className="px-5 py-3.5 rounded-2xl bg-sky-500 hover:bg-sky-600 text-white font-bold text-xs shadow-md flex items-center justify-center gap-2 transition-all active:scale-95 shrink-0 cursor-pointer"
              >
                <Navigation className={`w-4 h-4 ${isLocating ? 'animate-spin' : ''}`} />
                <span>{isLocating ? t('hero.locating') : t('hero.allow_location')}</span>
              </button>
            </div>

            {locatingStatus && (
              <p className="text-xs text-sky-600 dark:text-sky-400 font-semibold mt-2 text-center">
                {locatingStatus}
              </p>
            )}
          </div>

          {/* Main Hero Showcase Card */}
          <div
            className="relative rounded-3xl overflow-hidden shadow-2xl border transition-all duration-500 p-6 sm:p-10"
            style={{
              backgroundColor: 'var(--bg-card)',
              borderColor: category.borderColor,
            }}
          >
            {/* Subtle atmosphere background gradient matching AQI */}
            <div
              className="absolute top-0 right-0 w-96 h-96 rounded-full opacity-15 filter blur-3xl pointer-events-none"
              style={{ backgroundColor: category.color }}
            />

            <div className="relative grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              {/* Left Column: Big AQI Indicator & Main Info */}
              <div className="lg:col-span-7 space-y-5">
                <div className="flex flex-wrap items-center gap-2.5">
                  <span className="text-xs font-black px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200">
                    {currentStation.id}
                  </span>
                  <span className="text-xs text-slate-500 font-medium">
                    {t('hero.last_updated')}: {formatDateTime(currentStation.lastUpdated, lang)}
                  </span>
                </div>

                <div>
                  <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-slate-900 dark:text-white leading-tight">
                    {currentStation.name}
                  </h1>
                  <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1.5">
                    <MapPin className="w-4 h-4 text-orange-500 shrink-0" />
                    <span>{currentStation.address}</span>
                  </p>
                </div>

                {/* AQI Big Display & Status Banner */}
                <div className="flex flex-wrap items-center gap-5 pt-2">
                  <div
                    onClick={() => onSelectStation(currentStation)}
                    className="flex items-center justify-center rounded-3xl p-5 shadow-lg min-w-[140px] cursor-pointer hover:scale-105 transition-transform"
                    style={{
                      backgroundColor: category.bgColor,
                      border: `2px solid ${category.borderColor}`,
                    }}
                    title="Nhấn để xem chi tiết trạm / Click to view station details"
                  >
                    <div className="text-center">
                      <span
                        className="text-5xl sm:text-6xl font-black tracking-tighter"
                        style={{ color: category.color }}
                      >
                        {Math.round(currentStation.aqi)}
                      </span>
                      <span className="block text-[11px] font-black uppercase tracking-widest text-slate-500 mt-0.5">
                        AQI VN
                      </span>
                    </div>
                  </div>

                  <div className="space-y-1.5 flex-1 min-w-[200px]">
                    <div className="flex items-center gap-2">
                      <AQIBadge aqi={currentStation.aqi} size="lg" />
                      <span className="text-xs font-bold text-slate-500">
                        {t('hero.primary_pollutant')}: <strong className="text-orange-500">{currentStation.primaryPollutant}</strong>
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                      {lang === 'vi' ? category.descriptionVi : category.descriptionEn}
                    </p>
                  </div>
                </div>

                {/* Health Warning Bar */}
                <div
                  onClick={onNavigateToAlerts}
                  className="p-3.5 rounded-2xl border text-xs leading-relaxed flex items-start gap-2.5 cursor-pointer hover:opacity-90 transition-opacity"
                  style={{
                    backgroundColor: category.bgColor,
                    borderColor: category.borderColor,
                    color: category.textColor,
                  }}
                  title="Nhấn để xem toàn bộ khuyến nghị sức khỏe / Click to view health recommendations"
                >
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <div>
                    <strong className="font-bold">{lang === 'vi' ? 'Khuyến cáo:' : 'Advisory:'} </strong>
                    <span>{lang === 'vi' ? category.healthAdviceVi : category.healthAdviceEn}</span>
                  </div>
                </div>
              </div>

              {/* Right Column: 6 Weather Micro Metrics */}
              <div className="lg:col-span-5 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-2 gap-3.5">
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-800 flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-orange-100 dark:bg-orange-950/60 text-orange-500">
                    <Thermometer className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400 block">{t('hero.temp')}</span>
                    <span className="text-base font-black text-slate-900 dark:text-white">{currentStation.temperature}°C</span>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-800 flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-sky-100 dark:bg-sky-950/60 text-sky-500">
                    <Droplets className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400 block">{t('hero.humidity')}</span>
                    <span className="text-base font-black text-slate-900 dark:text-white">{currentStation.humidity}%</span>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-800 flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-500">
                    <Wind className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400 block">{t('hero.wind')}</span>
                    <span className="text-base font-black text-slate-900 dark:text-white">{currentStation.windSpeed} km/h</span>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-800 flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-500">
                    <Sun className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400 block">{t('hero.uv')}</span>
                    <span className="text-base font-black text-slate-900 dark:text-white">8.5 (Cao)</span>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-800 flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-purple-100 dark:bg-purple-950/60 text-purple-500">
                    <Eye className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400 block">{t('hero.visibility')}</span>
                    <span className="text-base font-black text-slate-900 dark:text-white">7.0 km</span>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-800 flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-blue-100 dark:bg-blue-950/60 text-blue-500">
                    <Gauge className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400 block">{t('hero.pressure')}</span>
                    <span className="text-base font-black text-slate-900 dark:text-white">1012 hPa</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </FadeIn>
      </section>

      {/* 2. BẢNG DỰ BÁO CHẤT LƯỢNG KHÔNG KHÍ 7 NGÀY TỚI */}
      <section className="space-y-4">
        <FadeIn direction="up">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                {t('table.title')}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Dự báo chỉ số ô nhiễm không khí theo ngày & tình trạng thời tiết (nhấn vào để xem dự báo chi tiết)
              </p>
            </div>

            {/* Province Filter */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 font-medium hidden sm:inline">{t('table.filter_region')}</span>
              <select
                value={selectedProvinceFilter}
                onChange={(e) => setSelectedProvinceFilter(e.target.value)}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-900 dark:text-white font-medium focus:outline-none focus:border-orange-500 cursor-pointer"
              >
                <option value="All">{lang === 'vi' ? 'Tất cả khu vực' : 'All Regions'}</option>
                {uniqueProvinces.filter((p) => p !== 'All').map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 text-slate-400 font-bold uppercase tracking-wider text-[11px]">
                  <th className="py-4 px-6">{t('table.col_day')}</th>
                  <th className="py-4 px-6">{t('table.col_area')}</th>
                  <th className="py-4 px-6">{t('table.col_level')}</th>
                  <th className="py-4 px-6">{t('table.col_id')}</th>
                  <th className="py-4 px-6">{t('table.col_aqi')}</th>
                  <th className="py-4 px-6">{t('table.col_temp')}</th>
                  <th className="py-4 px-6">{t('table.col_condition')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/70">
                {filteredForecast.map((item) => {
                  const cat = getAQICategory(item.aqi);
                  return (
                    <tr
                      key={item.id}
                      onClick={onNavigateToForecast}
                      className="hover:bg-slate-100 dark:hover:bg-slate-800/70 transition-colors cursor-pointer"
                      title="Nhấn để xem dự báo 7 ngày chi tiết / Click to view detailed 7-day forecast"
                      style={{
                        backgroundColor: item.aqi > 150 ? 'rgba(239, 68, 68, 0.04)' : undefined,
                      }}
                    >
                      <td className="py-4 px-6 font-bold text-slate-900 dark:text-white">
                        <div>
                          <span>{lang === 'vi' ? item.dayOfWeekVi : item.dayOfWeekEn}</span>
                          <span className="block text-[11px] text-slate-400 font-normal">{item.date}</span>
                        </div>
                      </td>
                      <td className="py-4 px-6 font-semibold text-slate-700 dark:text-slate-300">
                        {item.location}
                      </td>
                      <td className="py-4 px-6">
                        <AQIBadge aqi={item.aqi} size="sm" />
                      </td>
                      <td className="py-4 px-6 font-mono text-slate-500 font-medium">
                        {item.id}
                      </td>
                      <td className="py-4 px-6">
                        <span
                          className="font-black text-sm px-2.5 py-1 rounded-lg"
                          style={{ backgroundColor: cat.bgColor, color: cat.color }}
                        >
                          {Math.round(item.aqi)}
                        </span>
                      </td>
                      <td className="py-4 px-6 font-bold text-slate-800 dark:text-slate-200">
                        <span className="text-orange-500">{item.maxTemp}°</span> / <span className="text-sky-500">{item.minTemp}°</span>
                      </td>
                      <td className="py-4 px-6 text-slate-600 dark:text-slate-300">
                        <div className="flex items-center gap-2">
                          <span>{lang === 'vi' ? item.conditionVi : item.conditionEn}</span>
                          <span className="text-[10px] text-sky-500 font-semibold px-1.5 py-0.5 rounded bg-sky-50 dark:bg-sky-950/60">
                            {item.rainProbability}% mưa
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Card Grid View */}
          <div className="grid grid-cols-1 gap-3 md:hidden">
            {filteredForecast.map((item) => {
              const cat = getAQICategory(item.aqi);
              return (
                <div
                  key={item.id}
                  onClick={onNavigateToForecast}
                  className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-2.5 cursor-pointer hover:border-orange-500 transition-colors"
                  title="Nhấn để xem dự báo 7 ngày chi tiết / Click to view detailed forecast"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-slate-900 dark:text-white">
                        {lang === 'vi' ? item.dayOfWeekVi : item.dayOfWeekEn} ({item.date})
                      </span>
                      <span className="block text-[11px] text-slate-400">{item.location} • {item.id}</span>
                    </div>
                    <div
                      className="px-3 py-1 rounded-xl font-black text-sm"
                      style={{ backgroundColor: cat.bgColor, color: cat.color }}
                    >
                      AQI {Math.round(item.aqi)}
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-100 dark:border-slate-800">
                    <AQIBadge aqi={item.aqi} size="sm" />
                    <span className="font-bold">
                      {item.maxTemp}° / {item.minTemp}°C
                    </span>
                  </div>

                  <p className="text-xs text-slate-500">
                    {lang === 'vi' ? item.conditionVi : item.conditionEn} ({item.rainProbability}% xác suất mưa)
                  </p>
                </div>
              );
            })}
          </div>
        </FadeIn>
      </section>

      {/* 3. KHUYẾN CÁO SỨC KHỎE THEO NHÓM ĐỐI TƯỢNG */}
      <section className="space-y-4">
        <FadeIn direction="up">
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              {t('health.title')}
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              {t('health.subtitle')}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            {HEALTH_GROUPS_ADVICE.map((group) => {
              return (
                <div
                  key={group.id}
                  onClick={onNavigateToAlerts}
                  className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-md space-y-3 cursor-pointer hover:border-orange-500/70 hover:shadow-xl hover:-translate-y-0.5 transition-all"
                  title="Nhấn để xem trung tâm cảnh báo & bảo vệ sức khỏe / Click to view health alert center"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-2xl bg-orange-50 dark:bg-orange-950/50 text-orange-500">
                        {getHealthGroupIcon(group.icon)}
                      </div>
                      <h3 className="text-base font-bold text-slate-900 dark:text-white">
                        {lang === 'vi' ? group.titleVi : group.titleEn}
                      </h3>
                    </div>
                    <span className={`text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full ${
                      group.riskLevel === 'critical'
                        ? 'bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400'
                        : 'bg-orange-100 dark:bg-orange-950/60 text-orange-600 dark:text-orange-400'
                    }`}>
                      {group.riskLevel === 'critical' ? (lang === 'vi' ? 'Rủi ro cao' : 'Critical') : (lang === 'vi' ? 'Lưu ý' : 'Caution')}
                    </span>
                  </div>

                  <ul className="space-y-2 text-xs text-slate-600 dark:text-slate-300">
                    {(lang === 'vi' ? group.adviceVi : group.adviceEn).map((advice, idx) => (
                      <li key={idx} className="flex items-start gap-2 leading-relaxed">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                        <span>{advice}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </FadeIn>
      </section>

      {/* 4. THÔNG BÁO ĐẨY THEO VỊ TRÍ CỦA BẠN */}
      <section>
        <FadeIn direction="up">
          <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-slate-900 to-slate-950 text-white border border-slate-800 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-80 h-80 bg-orange-500/10 rounded-full blur-3xl pointer-events-none" />

            <div className="relative grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              <div className="lg:col-span-7 space-y-3">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-500/20 text-orange-400 text-xs font-bold border border-orange-500/30">
                  <BellRing className="w-3.5 h-3.5" />
                  <span>{lang === 'vi' ? 'Cảnh báo sớm thời gian thực' : 'Early Real-Time Alerts'}</span>
                </div>
                <h3 className="text-2xl font-black tracking-tight">{t('notif.title')}</h3>
                <p className="text-xs text-slate-300 leading-relaxed max-w-xl">
                  {t('notif.desc')}
                </p>

                {/* Slider for AQI Alert Threshold */}
                <div className="pt-3 max-w-md space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-300 font-semibold">{t('notif.threshold_label')}</span>
                    <span className="font-black text-orange-400 px-2 py-0.5 rounded bg-orange-500/20">
                      AQI &gt; {customThreshold}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="50"
                    max="200"
                    step="10"
                    value={customThreshold}
                    onChange={(e) => setCustomThreshold(Number(e.target.value))}
                    className="w-full accent-orange-500 h-2 bg-slate-800 rounded-lg cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-slate-400 font-medium">
                    <span>50 (Tốt)</span>
                    <span>100 (Trung bình)</span>
                    <span>150 (Kém)</span>
                    <span>200 (Xấu)</span>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-5 flex flex-col justify-center">
                <button
                  onClick={handleSaveNotificationConfig}
                  className="w-full py-3.5 px-6 rounded-2xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs shadow-lg transition-all active:scale-98 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Bell className="w-4 h-4" />
                  <span>{preferences.enabled ? t('notif.enabled') : t('notif.enable_btn')}</span>
                </button>
              </div>
            </div>
          </div>
        </FadeIn>
      </section>

      {/* 5. CHỈ SỐ CÁC CHẤT Ô NHIỄM CHI TIẾT */}
      <section className="space-y-4">
        <FadeIn direction="up">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                {t('pollutants.title')}
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                {t('pollutants.subtitle')}
              </p>
            </div>
            <button
              onClick={() => onSelectStation(currentStation)}
              className="text-xs font-semibold text-orange-500 hover:text-orange-600 flex items-center gap-1 self-start sm:self-auto cursor-pointer"
            >
              <span>{lang === 'vi' ? 'Xem chi tiết thông số trạm' : 'View detailed station specs'}</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5 mt-4">
            {(Object.entries(currentStation.pollutants) as [string, PollutantDetail][]).map(([key, poll]) => {
              const isOverLimit = poll.value > poll.maxSafe;
              const title = key === 'pm25' ? 'PM2.5' : key.toUpperCase();

              return (
                <div
                  key={key}
                  onClick={() => onSelectStation(currentStation)}
                  className={`p-4 rounded-2xl bg-white dark:bg-slate-900 border transition-all hover:shadow-lg hover:-translate-y-0.5 cursor-pointer ${
                    isOverLimit
                      ? 'border-orange-300 dark:border-orange-900/60 hover:border-orange-500'
                      : 'border-slate-200 dark:border-slate-800 hover:border-sky-500'
                  }`}
                  title="Nhấn để xem phân tích chi tiết / Click to view detailed analysis"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-black text-slate-700 dark:text-slate-200">{title}</span>
                    <div className="flex items-center gap-0.5 text-[10px] font-bold">
                      {poll.trend === 'up' && <ArrowUpRight className="w-3 h-3 text-red-500" />}
                      {poll.trend === 'down' && <ArrowDownRight className="w-3 h-3 text-emerald-500" />}
                      {poll.trend === 'stable' && <Minus className="w-3 h-3 text-slate-400" />}
                      <span className={poll.trend === 'up' ? 'text-red-500' : poll.trend === 'down' ? 'text-emerald-500' : 'text-slate-400'}>
                        {poll.changePercent > 0 ? `+${poll.changePercent}%` : `${poll.changePercent}%`}
                      </span>
                    </div>
                  </div>

                  <div className="my-2">
                    <span className={`text-2xl font-black ${isOverLimit ? 'text-orange-500' : 'text-slate-900 dark:text-white'}`}>
                      {poll.value}
                    </span>
                    <span className="text-[11px] text-slate-400 font-medium ml-1">{poll.unit}</span>
                  </div>

                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[10px] text-slate-400">
                    <span>{t('pollutants.safe_limit')}:</span>
                    <span className="font-semibold text-slate-600 dark:text-slate-300">
                      {poll.maxSafe} {poll.unit}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </FadeIn>
      </section>

      {/* 6. BIỂU ĐỒ PHÂN TÍCH CHẤT LƯỢNG KHÔNG KHÍ */}
      <section className="space-y-4">
        <FadeIn direction="up">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                {t('charts.title')}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Dữ liệu phân tích theo chuỗi thời gian tại {currentStation.name}
              </p>
            </div>

            {/* Chart Tab Selector */}
            <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-2xl self-start sm:self-auto">
              <button
                onClick={() => setChartTab('24h')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  chartTab === '24h'
                    ? 'bg-white dark:bg-slate-900 text-orange-500 shadow-xs'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {t('charts.tab_24h')}
              </button>
              <button
                onClick={() => setChartTab('pollutants')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  chartTab === 'pollutants'
                    ? 'bg-white dark:bg-slate-900 text-orange-500 shadow-xs'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {t('charts.tab_pollutants')}
              </button>
              <button
                onClick={() => setChartTab('temp')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  chartTab === 'temp'
                    ? 'bg-white dark:bg-slate-900 text-orange-500 shadow-xs'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {t('charts.tab_temp')}
              </button>
            </div>
          </div>

          <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl">
            {chartTab === '24h' && (
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={HOURLY_AQI_DATA_24H} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="aqiGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#F97316" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#F97316" stopOpacity={0.0} />
                      </linearGradient>
                      <linearGradient id="pmGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#0284C7" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#0284C7" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.2} vertical={false} />
                    <XAxis dataKey="hour" stroke="#94A3B8" fontSize={11} tickLine={false} />
                    <YAxis stroke="#94A3B8" fontSize={11} tickLine={false} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#0F172A',
                        borderColor: '#334155',
                        borderRadius: '12px',
                        color: '#F8FAFC',
                        fontSize: '12px',
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="aqi"
                      name="AQI VN"
                      stroke="#F97316"
                      strokeWidth={3}
                      fillOpacity={1}
                      fill="url(#aqiGrad)"
                    />
                    <Area
                      type="monotone"
                      dataKey="pm25"
                      name="PM2.5 (µg/m³)"
                      stroke="#0284C7"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#pmGrad)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}

            {chartTab === 'pollutants' && (
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={pollutantDataForBarChart} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.2} vertical={false} />
                    <XAxis dataKey="name" stroke="#94A3B8" fontSize={11} tickLine={false} />
                    <YAxis stroke="#94A3B8" fontSize={11} tickLine={false} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#0F172A',
                        borderColor: '#334155',
                        borderRadius: '12px',
                        color: '#F8FAFC',
                        fontSize: '12px',
                      }}
                    />
                    <Bar dataKey="value" name="Nồng độ hiện tại" radius={[8, 8, 0, 0]}>
                      {pollutantDataForBarChart.map((entry, idx) => (
                        <Cell
                          key={`cell-${idx}`}
                          fill={entry.value > entry.safe ? '#EF4444' : '#0284C7'}
                        />
                      ))}
                    </Bar>
                    <Bar dataKey="safe" name="Ngưỡng chuẩn an toàn" fill="#94A3B8" opacity={0.3} radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {chartTab === 'temp' && (
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={SEVEN_DAY_FORECAST} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.2} vertical={false} />
                    <XAxis dataKey="dayOfWeekVi" stroke="#94A3B8" fontSize={11} tickLine={false} />
                    <YAxis stroke="#94A3B8" fontSize={11} tickLine={false} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#0F172A',
                        borderColor: '#334155',
                        borderRadius: '12px',
                        color: '#F8FAFC',
                        fontSize: '12px',
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="maxTemp"
                      name="Nhiệt độ cao nhất (°C)"
                      stroke="#EF4444"
                      strokeWidth={3}
                      dot={{ r: 4 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="minTemp"
                      name="Nhiệt độ thấp nhất (°C)"
                      stroke="#38BDF8"
                      strokeWidth={2}
                      dot={{ r: 3 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="rainProbability"
                      name="Xác suất mưa (%)"
                      stroke="#10B981"
                      strokeWidth={2}
                      strokeDasharray="4 4"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </FadeIn>
      </section>

      {/* 7. BẢN ĐỒ NHIỆT CHẤT LƯỢNG KHÔNG KHÍ VIỆT NAM */}
      <section className="space-y-4">
        <FadeIn direction="up">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2 mb-2">
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                {t('map.title')}
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                {t('map.subtitle')}
              </p>
            </div>
            <button
              onClick={onNavigateToMaps}
              className="text-xs font-semibold px-4 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white shadow-sm flex items-center gap-1.5 self-start sm:self-auto transition-all active:scale-95 cursor-pointer"
            >
              <span>{t('map.view_full')}</span>
              <ArrowUpRight className="w-4 h-4" />
            </button>
          </div>

          <VietnamMap
            stations={VIETNAM_STATIONS}
            selectedStation={currentStation}
            onSelectStation={(st) => {
              setCurrentStation(st);
              onSelectStation(st);
            }}
            onOpenFullMap={onNavigateToMaps}
          />
        </FadeIn>
      </section>

      {/* 8. KHUNG GIỜ RA NGOÀI TỐT NHẤT & MẸO BẢO VỆ SỨC KHỎE */}
      <section className="space-y-6">
        <FadeIn direction="up">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Best Outdoor Hours */}
            <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-md space-y-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-sky-100 dark:bg-sky-950/60 text-sky-500">
                  <Clock className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  {t('insights.best_hours_title')}
                </h3>
              </div>

              <div className="space-y-2.5 text-xs">
                {BEST_OUTDOOR_HOURS.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 flex items-center justify-between gap-2 hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors cursor-pointer"
                  >
                    <div>
                      <span className="font-bold text-slate-800 dark:text-slate-200 block">{item.time}</span>
                      <span className="text-[10px] text-slate-500">{lang === 'vi' ? item.adviceVi : item.adviceEn}</span>
                    </div>
                    <AQIBadge aqi={item.aqi} size="sm" />
                  </div>
                ))}
              </div>
            </div>

            {/* Quick City Comparisons */}
            <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-md space-y-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-orange-100 dark:bg-orange-950/60 text-orange-500">
                  <Activity className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  {t('insights.city_compare_title')}
                </h3>
              </div>

              <div className="space-y-2 text-xs">
                {CITY_COMPARISONS.slice(0, 5).map((c, idx) => {
                  const cat = getAQICategory(c.aqi);
                  return (
                    <div
                      key={idx}
                      onClick={() => {
                        const match = VIETNAM_STATIONS.find(
                          (s) =>
                            s.province.toLowerCase().includes(c.city.toLowerCase()) ||
                            c.city.toLowerCase().includes(s.province.toLowerCase())
                        );
                        if (match) {
                          setCurrentStation(match);
                          onSelectStation(match);
                        }
                      }}
                      className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 flex items-center justify-between cursor-pointer hover:bg-orange-50/60 dark:hover:bg-orange-950/30 hover:scale-[1.02] transition-all"
                      title={`Nhấn để chuyển sang trạm ${c.city} / Click to view ${c.city} station`}
                    >
                      <div>
                        <span className="font-bold text-slate-900 dark:text-white">{c.city}</span>
                        <span className="text-[10px] text-slate-400 block">{c.temp}°C • PM2.5: {c.pm25}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span
                          className="font-black text-xs px-2 py-0.5 rounded-md"
                          style={{ backgroundColor: cat.bgColor, color: cat.color }}
                        >
                          {c.aqi}
                        </span>
                        <AQIBadge aqi={c.aqi} size="sm" showIcon={false} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Indoor Air Purification Tips */}
            <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-md space-y-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-500">
                  <Leaf className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  {t('insights.tips_title')}
                </h3>
              </div>

              <div className="space-y-3 text-xs">
                {INDOOR_AIR_TIPS.map((tip, idx) => (
                  <div key={idx} className="space-y-1 p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors cursor-pointer">
                    <h4 className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      <span>{lang === 'vi' ? tip.titleVi : tip.titleEn}</span>
                    </h4>
                    <p className="text-slate-500 leading-relaxed text-[11px] pl-3">
                      {lang === 'vi' ? tip.descVi : tip.descEn}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </FadeIn>
      </section>
    </div>
  );
};
