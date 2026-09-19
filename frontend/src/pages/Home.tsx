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
    <div className="w-full space-y-12 pb-16">
      {/* 1. HERO SECTION */}
      <section aria-labelledby="current-air-quality-title" className="relative pt-6 sm:pt-10">
        <FadeIn direction="up">
          {/* Search and Location Bar */}
          <div className="max-w-4xl mx-auto mb-8">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
              {/* Search Input with Autocomplete */}
              <div className="relative flex-1">
                <Search className="w-5 h-5 text-[var(--text-tertiary)] absolute left-4 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onFocus={() => setIsSearching(true)}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setIsSearching(true);
                  }}
                  placeholder={t('hero.search_placeholder')}
                  className="w-full bg-[var(--surface-card)] border border-[var(--border-default)] rounded-xl pl-12 pr-4 py-3.5 text-sm text-[var(--text-primary)] shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-500/40 focus:border-orange-500 transition-all placeholder:text-[var(--text-tertiary)]"
                />

                {/* Autocomplete Dropdown */}
                {isSearching && searchResults.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-[var(--surface-card)] border border-[var(--border-default)] rounded-2xl shadow-2xl z-50 max-h-72 overflow-y-auto divide-y divide-[var(--border-default)]">
                    {searchResults.map((st) => (
                      <div
                        key={st.id}
                        onClick={() => {
                          setCurrentStation(st);
                          setIsSearching(false);
                          setSearchQuery('');
                        }}
                        className="p-3.5 hover:bg-[var(--surface-subtle)] cursor-pointer flex items-center justify-between transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-xl bg-[var(--surface-subtle)] text-[var(--text-secondary)]">
                            <MapPin className="w-4 h-4 text-orange-500" />
                          </div>
                          <div>
                            <p className="text-xs font-bold text-[var(--text-primary)]">{st.name}</p>
                            <p className="text-xs text-[var(--text-secondary)]">{st.province} • {st.address}</p>
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
                className="px-5 py-3.5 rounded-xl bg-[var(--surface-card)] hover:bg-[var(--surface-subtle)] border border-[var(--border-default)] text-[var(--text-primary)] font-bold text-xs shadow-sm flex items-center justify-center gap-2 transition-all active:scale-95 shrink-0 cursor-pointer disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-focus)] focus-visible:ring-offset-2"
              >
                <Navigation className={`w-4 h-4 text-sky-600 dark:text-sky-400 ${isLocating ? 'animate-spin' : ''}`} />
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
            className="relative rounded-3xl overflow-hidden shadow-[var(--shadow-card)] border transition-all duration-500 p-6 sm:p-10"
            style={{
              backgroundColor: 'var(--surface-card)',
              borderColor: category.borderColor,
            }}
          >
            <div className="relative grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              {/* Left Column: Big AQI Indicator & Main Info */}
              <div className="lg:col-span-7 space-y-5">
                <div className="flex flex-wrap items-center gap-2.5">
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-[var(--surface-subtle)] text-[var(--text-secondary)]">
                    {currentStation.id}
                  </span>
                  <span className="text-xs text-[var(--text-tertiary)] font-medium">
                    {t('hero.last_updated')}: {formatDateTime(currentStation.lastUpdated, lang)}
                  </span>
                </div>

                <div>
                  <h1 id="current-air-quality-title" className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-[var(--text-primary)] leading-tight">
                    {currentStation.name}
                  </h1>
                  <p className="text-xs sm:text-sm text-[var(--text-secondary)] mt-1 flex items-center gap-1.5">
                    <MapPin className="w-4 h-4 text-orange-500 shrink-0" />
                    <span>{currentStation.address}</span>
                  </p>
                </div>

                {/* AQI Big Display & Status Banner */}
                <div className="flex flex-wrap items-center gap-5 pt-2">
                  <button
                    type="button"
                    onClick={() => onSelectStation(currentStation)}
                    aria-label={`${lang === 'vi' ? 'Xem chi tiết trạm' : 'View station details'}: ${currentStation.name}`}
                    className="flex items-center justify-center rounded-3xl p-5 shadow-md min-w-[140px] cursor-pointer hover:scale-105 transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
                    style={{
                      backgroundColor: 'var(--bg-card-header)',
                      border: '2px solid var(--border-color)',
                    }}
                    title="Nhấn để xem chi tiết trạm / Click to view station details"
                  >
                    <div className="text-center">
                      <span
                        aria-label={`AQI ${Math.round(currentStation.aqi)}`}
                        className="text-5xl sm:text-6xl font-black tracking-tighter"
                        style={{ color: category.color }}
                      >
                        {Math.round(currentStation.aqi)}
                      </span>
                      <span className="block text-xs font-black uppercase tracking-widest text-[var(--text-secondary)] mt-0.5">
                        AQI VN
                      </span>
                    </div>
                  </button>

                  <div className="space-y-1.5 flex-1 min-w-[200px]">
                    <div className="flex items-center gap-2">
                      <AQIBadge aqi={currentStation.aqi} size="lg" />
                      <span className="text-xs font-bold text-[var(--text-secondary)]">
                        {t('hero.primary_pollutant')}: <strong className="text-orange-500">{currentStation.primaryPollutant}</strong>
                      </span>
                    </div>
                    <p className="text-sm text-[var(--text-secondary)] leading-6">
                      {lang === 'vi' ? category.descriptionVi : category.descriptionEn}
                    </p>
                  </div>
                </div>

                {/* Health Warning Bar */}
                <button
                  type="button"
                  onClick={onNavigateToAlerts}
                  aria-label={lang === 'vi' ? 'Xem khuyến cáo sức khỏe' : 'View health advice'}
                  className="w-full text-left p-3.5 rounded-2xl border text-xs leading-relaxed flex items-start gap-2.5 cursor-pointer hover:opacity-90 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
                  style={{
                    backgroundColor: 'var(--bg-card-header)',
                    borderColor: 'var(--border-color)',
                    color: category.textColor,
                  }}
                  title="Nhấn để xem toàn bộ khuyến nghị sức khỏe / Click to view health recommendations"
                >
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <div>
                    <strong className="font-bold">{lang === 'vi' ? 'Khuyến cáo:' : 'Advisory:'} </strong>
                    <span>{lang === 'vi' ? category.healthAdviceVi : category.healthAdviceEn}</span>
                  </div>
                </button>
              </div>

              {/* Right Column: 6 Weather Micro Metrics */}
              <div className="lg:col-span-5 grid grid-cols-2 sm:grid-cols-3 gap-3 w-full">
                <div className="min-w-0 min-h-[76px] px-2.5 py-2 rounded-xl bg-orange-100/40 dark:bg-orange-950/30 border border-orange-200/70 dark:border-orange-900/50 flex flex-col items-center justify-center text-center">
                  <div className="flex items-center gap-1.5">
                    <Thermometer className="w-4 h-4 text-[var(--text-secondary)]" />
                    <span className="text-xs uppercase tracking-wide font-medium text-[var(--text-secondary)]">{t('hero.temp')}</span>
                  </div>
                  <span className="text-xs font-semibold text-[var(--text-primary)] mt-1">{currentStation.temperature}°C</span>
                </div>

                <div className="min-w-0 min-h-[76px] px-2.5 py-2 rounded-xl bg-orange-100/40 dark:bg-orange-950/30 border border-orange-200/70 dark:border-orange-900/50 flex flex-col items-center justify-center text-center">
                  <div className="flex items-center gap-1.5">
                    <Droplets className="w-4 h-4 text-[var(--text-secondary)]" />
                    <span className="text-xs uppercase tracking-wide font-medium text-[var(--text-secondary)]">{t('hero.humidity')}</span>
                  </div>
                  <span className="text-xs font-semibold text-[var(--text-primary)] mt-1">{currentStation.humidity}%</span>
                </div>

                <div className="min-w-0 min-h-[76px] px-2.5 py-2 rounded-xl bg-orange-100/40 dark:bg-orange-950/30 border border-orange-200/70 dark:border-orange-900/50 flex flex-col items-center justify-center text-center">
                  <div className="flex items-center gap-1.5">
                    <Wind className="w-4 h-4 text-[var(--text-secondary)]" />
                    <span className="text-xs uppercase tracking-wide font-medium text-[var(--text-secondary)]">{t('hero.wind')}</span>
                  </div>
                  <span className="text-xs font-semibold text-[var(--text-primary)] mt-1">{currentStation.windSpeed} km/h</span>
                </div>

                <div className="min-w-0 min-h-[76px] px-2.5 py-2 rounded-xl bg-orange-100/40 dark:bg-orange-950/30 border border-orange-200/70 dark:border-orange-900/50 flex flex-col items-center justify-center text-center">
                  <div className="flex items-center gap-1.5">
                    <Sun className="w-4 h-4 text-[var(--text-secondary)]" />
                    <span className="text-xs uppercase tracking-wide font-medium text-[var(--text-secondary)]">{t('hero.uv')}</span>
                  </div>
                  <span className="text-xs font-semibold text-[var(--text-primary)] mt-1">8.5 (Cao)</span>
                </div>

                <div className="min-w-0 min-h-[76px] px-2.5 py-2 rounded-xl bg-orange-100/40 dark:bg-orange-950/30 border border-orange-200/70 dark:border-orange-900/50 flex flex-col items-center justify-center text-center">
                  <div className="flex items-center gap-1.5">
                    <Eye className="w-4 h-4 text-[var(--text-secondary)]" />
                    <span className="text-xs uppercase tracking-wide font-medium text-[var(--text-secondary)]">{t('hero.visibility')}</span>
                  </div>
                  <span className="text-xs font-semibold text-[var(--text-primary)] mt-1">7.0 km</span>
                </div>

                <div className="min-w-0 min-h-[76px] px-2.5 py-2 rounded-xl bg-orange-100/40 dark:bg-orange-950/30 border border-orange-200/70 dark:border-orange-900/50 flex flex-col items-center justify-center text-center">
                  <div className="flex items-center gap-1.5">
                    <Gauge className="w-4 h-4 text-[var(--text-secondary)]" />
                    <span className="text-xs uppercase tracking-wide font-medium text-[var(--text-secondary)]">{t('hero.pressure')}</span>
                  </div>
                  <span className="text-xs font-semibold text-[var(--text-primary)] mt-1">1012 hPa</span>
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
              <h2 className="text-xl sm:text-2xl font-black text-[var(--text-primary)] tracking-tight">
                {t('table.title')}
              </h2>
              <p className="text-xs text-[var(--text-tertiary)] mt-0.5">
                Dự báo chỉ số ô nhiễm không khí theo ngày & tình trạng thời tiết (nhấn vào để xem dự báo chi tiết)
              </p>
            </div>

            {/* Province Filter */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-[var(--text-tertiary)] font-medium hidden sm:inline">{t('table.filter_region')}</span>
              <select
                value={selectedProvinceFilter}
                onChange={(e) => setSelectedProvinceFilter(e.target.value)}
                className="bg-[var(--surface-card)] border border-[var(--border-default)] rounded-xl px-3 py-1.5 text-xs text-[var(--text-primary)] font-medium focus:outline-none focus:border-orange-500 cursor-pointer"
              >
                <option value="All">{lang === 'vi' ? 'Tất cả khu vực' : 'All Regions'}</option>
                {uniqueProvinces.filter((p) => p !== 'All').map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
          </div>

          {filteredForecast.length === 0 ? (
            <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--surface-card)] p-8 text-center shadow-[var(--shadow-card)]">
              <p className="text-sm font-semibold text-[var(--text-primary)]">
                {lang === 'vi' ? 'Không có dữ liệu dự báo cho khu vực đã chọn.' : 'Forecast unavailable for the selected province.'}
              </p>
              <p className="mt-1 text-xs text-[var(--text-tertiary)]">
                {lang === 'vi' ? 'Hãy thử chọn khu vực khác hoặc mở trang Dự báo.' : 'Try another province or open the Forecast page.'}
              </p>
              <button
                type="button"
                onClick={onNavigateToForecast}
                className="mt-4 rounded-xl bg-orange-700 px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-orange-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
              >
                {lang === 'vi' ? 'Mở trang Dự báo' : 'Open Forecast'}
              </button>
            </div>
          ) : (
          <>
          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto rounded-2xl border border-[var(--border-default)] bg-[var(--surface-card)] shadow-[var(--shadow-card)]">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[var(--border-default)] bg-[var(--surface-header)] text-[var(--text-secondary)] font-bold uppercase tracking-wider text-xs">
                  <th className="py-4 px-6">{t('table.col_day')}</th>
                  <th className="py-4 px-6">{t('table.col_area')}</th>
                  <th className="py-4 px-6">{t('table.col_level')}</th>
                  <th className="py-4 px-6">{t('table.col_aqi')}</th>
                  <th className="py-4 px-6">{t('table.col_temp')}</th>
                  <th className="py-4 px-6">{t('table.col_condition')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-default)]">
                {filteredForecast.map((item) => {
                  const cat = getAQICategory(item.aqi);
                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-[var(--surface-subtle)] transition-colors"
                      title="Nhấn để xem dự báo 7 ngày chi tiết / Click to view detailed 7-day forecast"
                      style={{
                        backgroundColor: item.aqi > 150 ? 'rgba(239, 68, 68, 0.04)' : undefined,
                      }}
                    >
                      <td className="py-4 px-6 font-bold text-[var(--text-primary)]">
                        <button
                          type="button"
                          onClick={onNavigateToForecast}
                          className="text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-orange-500 rounded-sm"
                          aria-label={`${lang === 'vi' ? 'Xem dự báo' : 'View forecast'}: ${item.location}, ${item.date}`}
                        >
                          <span>{lang === 'vi' ? item.dayOfWeekVi : item.dayOfWeekEn}</span>
                          <span className="block text-xs text-[var(--text-tertiary)] font-normal">{item.date}</span>
                        </button>
                      </td>
                      <td className="py-4 px-6 font-semibold text-[var(--text-secondary)]">
                        {item.location}
                      </td>
                      <td className="py-4 px-6">
                        <span
                          className="text-[0.84rem] font-bold tracking-wide"
                          style={{ color: cat.textColor }}
                        >
                          {lang === 'vi' ? cat.labelVi : cat.labelEn}
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        <span
                          className="font-bold text-sm px-2.5 py-1 rounded-lg"
                          style={{ backgroundColor: cat.bgColor, color: cat.color }}
                        >
                          {Math.round(item.aqi)}
                        </span>
                      </td>
                      <td className="py-4 px-6 font-bold text-[var(--text-primary)]">
                        <span className="text-orange-500">{item.maxTemp}°</span> / <span className="text-sky-500">{item.minTemp}°</span>
                      </td>
                      <td className="py-4 px-6 text-[var(--text-secondary)]">
                        <div className="flex items-center gap-2">
                          <span>{lang === 'vi' ? item.conditionVi : item.conditionEn}</span>
                          <span className="text-xs text-sky-700 dark:text-sky-300 font-semibold px-1.5 py-0.5 rounded bg-sky-50 dark:bg-sky-950/60">
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
                <article
                  key={item.id}
                  onClick={onNavigateToForecast}
                  className="p-4 rounded-2xl bg-[var(--surface-card)] border border-[var(--border-default)] shadow-[var(--shadow-card)] space-y-2.5 cursor-pointer hover:border-white/35 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
                  tabIndex={0}
                  role="button"
                  aria-label={`${lang === 'vi' ? 'Xem dự báo' : 'View forecast'}: ${item.location}, ${item.date}`}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') onNavigateToForecast();
                  }}
                  title="Nhấn để xem dự báo 7 ngày chi tiết / Click to view detailed forecast"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-[var(--text-primary)]">
                        {lang === 'vi' ? item.dayOfWeekVi : item.dayOfWeekEn} ({item.date})
                      </span>
                      <span className="block text-xs text-[var(--text-tertiary)]">{item.location}</span>
                    </div>
                    <div
                      className="px-3 py-1 rounded-xl font-bold text-sm"
                      style={{ backgroundColor: cat.bgColor, color: cat.color }}
                    >
                      AQI {Math.round(item.aqi)}
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs pt-2 border-t border-[var(--border-default)]">
                    <AQIBadge aqi={item.aqi} size="sm" />
                    <span className="font-bold text-[var(--text-primary)]">
                      {item.maxTemp}° / {item.minTemp}°C
                    </span>
                  </div>

                  <p className="text-xs text-[var(--text-tertiary)]">
                    {lang === 'vi' ? item.conditionVi : item.conditionEn} ({item.rainProbability}% xác suất mưa)
                  </p>
                </article>
              );
            })}
          </div>
          </>
          )}
        </FadeIn>
      </section>

      {/* 3. KHUYẾN CÁO SỨC KHỎE THEO NHÓM ĐỐI TƯỢNG */}
      <section className="space-y-4">
        <FadeIn direction="up">
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-[var(--text-primary)] tracking-tight">
              {t('health.title')}
            </h2>
            <p className="text-xs text-[var(--text-tertiary)] mt-1">
              {t('health.subtitle')}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            {HEALTH_GROUPS_ADVICE.map((group) => {
              return (
                <div
                  key={group.id}
                  onClick={onNavigateToAlerts}
                  className="p-6 rounded-2xl bg-[var(--surface-card)] border border-[var(--border-default)] shadow-[var(--shadow-card)] space-y-3 cursor-pointer hover:border-white/35 hover:shadow-[var(--shadow-card)] hover:-translate-y-0.5 transition-all"
                  title="Nhấn để xem trung tâm cảnh báo & bảo vệ sức khỏe / Click to view health alert center"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-2xl bg-orange-50 dark:bg-orange-950/50 text-orange-500">
                        {getHealthGroupIcon(group.icon)}
                      </div>
                      <h3 className="text-base font-bold text-[var(--text-primary)]">
                        {lang === 'vi' ? group.titleVi : group.titleEn}
                      </h3>
                    </div>
                    <span className={`text-xs uppercase tracking-wider font-bold px-2 py-0.5 rounded-full ${
                      group.riskLevel === 'critical'
                        ? 'bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400'
                        : 'bg-orange-100 dark:bg-orange-950/60 text-orange-600 dark:text-orange-400'
                    }`}>
                      {group.riskLevel === 'critical' ? (lang === 'vi' ? 'Rủi ro cao' : 'Critical') : (lang === 'vi' ? 'Lưu ý' : 'Caution')}
                    </span>
                  </div>

                  <ul className="space-y-2 text-sm leading-6 text-[var(--text-secondary)]">
                    {(lang === 'vi' ? group.adviceVi : group.adviceEn).map((advice, idx) => (
                      <li key={idx} className="flex items-start gap-2">
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
          <div className="p-6 sm:p-8 rounded-2xl bg-[var(--surface-card)] text-[var(--text-primary)] border border-[var(--border-default)] shadow-[var(--shadow-card)] relative overflow-hidden transition-colors duration-300">
            <div className="absolute top-0 right-0 w-80 h-80 bg-orange-500/10 rounded-full blur-3xl pointer-events-none" />

            <div className="relative grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              <div className="lg:col-span-7 space-y-3">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-100 dark:bg-orange-500/20 text-orange-600 dark:text-orange-400 text-xs font-bold border border-orange-200 dark:border-orange-500/30 transition-colors duration-300">
                  <BellRing className="w-3.5 h-3.5" />
                  <span>{lang === 'vi' ? 'Cảnh báo sớm thời gian thực' : 'Early Real-Time Alerts'}</span>
                </div>
                <h3 className="text-2xl font-black tracking-tight">{t('notif.title')}</h3>
                <p className="text-sm leading-6 text-[var(--text-secondary)] max-w-xl transition-colors duration-300">
                  {t('notif.desc')}
                </p>

                {/* Slider for AQI Alert Threshold */}
                <div className="pt-3 max-w-md space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[var(--text-secondary)] font-semibold transition-colors duration-300">
                      {t('notif.threshold_label')}
                    </span>
                    <span className="font-bold text-orange-600 dark:text-orange-400 px-2 py-0.5 rounded bg-orange-100 dark:bg-orange-500/20 transition-colors duration-300">
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
                    className="w-full h-2 rounded-lg cursor-pointer accent-orange-500 bg-slate-200 dark:bg-slate-700 transition-colors duration-300"
                  />
                  
                  <div className="flex justify-between text-xs text-[var(--text-secondary)] font-medium transition-colors duration-300">
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
                  className="w-full py-3.5 px-6 rounded-2xl bg-orange-700 hover:bg-orange-800 text-white font-bold text-xs shadow-md transition-all active:scale-98 flex items-center justify-center gap-2 cursor-pointer"
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
              <h2 className="text-xl sm:text-2xl font-black text-[var(--text-primary)] tracking-tight">
                {t('pollutants.title')}
              </h2>
              <p className="text-xs text-[var(--text-tertiary)] mt-1">
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
                  className={`p-4 rounded-xl bg-[var(--surface-card)] border transition-all hover:shadow-[var(--shadow-card)] hover:-translate-y-0.5 cursor-pointer ${
                    isOverLimit
                      ? 'border-orange-300 dark:border-orange-900/60 hover:border-white/35'
                        : 'border-[var(--border-default)] hover:border-white/35'
                  }`}
                  title="Nhấn để xem phân tích chi tiết / Click to view detailed analysis"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-[var(--text-secondary)]">{title}</span>
                    <div className="flex items-center gap-0.5 text-xs font-bold">
                      {poll.trend === 'up' && <ArrowUpRight className="w-3 h-3 text-red-500" />}
                      {poll.trend === 'down' && <ArrowDownRight className="w-3 h-3 text-emerald-500" />}
                      {poll.trend === 'stable' && <Minus className="w-3 h-3 text-slate-400" />}
                      <span className={poll.trend === 'up' ? 'text-red-500' : poll.trend === 'down' ? 'text-emerald-500' : 'text-slate-400'}>
                        {poll.changePercent > 0 ? `+${poll.changePercent}%` : `${poll.changePercent}%`}
                      </span>
                    </div>
                  </div>

                  <div className="my-2">
                    <span className={`text-2xl font-bold ${isOverLimit ? 'text-orange-500' : 'text-[var(--text-primary)]'}`}>
                      {poll.value}
                    </span>
                    <span className="text-xs text-[var(--text-tertiary)] font-medium ml-1">{poll.unit}</span>
                  </div>

                  <div className="pt-2 border-t border-[var(--border-default)] flex items-center justify-between text-xs text-[var(--text-tertiary)]">
                    <span>{t('pollutants.safe_limit')}:</span>
                    <span className="font-semibold text-[var(--text-secondary)]">
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
              <h2 className="text-xl sm:text-2xl font-black text-[var(--text-primary)] tracking-tight">
                {t('charts.title')}
              </h2>
              <p className="text-xs text-[var(--text-tertiary)] mt-0.5">
                Dữ liệu phân tích theo chuỗi thời gian tại {currentStation.name}
              </p>
            </div>

            {/* Chart Tab Selector */}
            <div className="flex items-center gap-1 p-1 bg-[var(--surface-subtle)] rounded-2xl self-start sm:self-auto">
              <button
                onClick={() => setChartTab('24h')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  chartTab === '24h'
                    ? 'bg-white dark:surface-card text-orange-500 shadow-xs'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {t('charts.tab_24h')}
              </button>
              <button
                onClick={() => setChartTab('pollutants')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  chartTab === 'pollutants'
                    ? 'bg-white dark:surface-card text-orange-500 shadow-xs'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {t('charts.tab_pollutants')}
              </button>
              <button
                onClick={() => setChartTab('temp')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  chartTab === 'temp'
                    ? 'bg-white dark:surface-card text-orange-500 shadow-xs'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {t('charts.tab_temp')}
              </button>
            </div>
          </div>

          <div className="p-6 rounded-2xl bg-[var(--surface-card)] border border-[var(--border-default)] shadow-[var(--shadow-card)]">
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
              <div className="h-72 w-full [&_*:focus]:outline-none">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={pollutantDataForBarChart} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.2} vertical={false} />
                    <XAxis dataKey="name" stroke="#94A3B8" fontSize={11} tickLine={false} />
                    <YAxis stroke="#94A3B8" fontSize={11} tickLine={false} />
                    <Tooltip
                      cursor={false}
                      contentStyle={{
                        backgroundColor: '#0F172A',
                        borderColor: '#334155',
                        borderRadius: '12px',
                        color: '#F8FAFC',
                        fontSize: '12px',
                      }}
                    />
                    <Bar dataKey="value" name="Nồng độ hiện tại" activeBar={false} radius={[8, 8, 0, 0]}>
                      {pollutantDataForBarChart.map((entry, idx) => (
                        <Cell
                          key={`cell-${idx}`}
                          fill={entry.value > entry.safe ? '#EF4444' : '#0284C7'}
                        />
                      ))}
                    </Bar>
                    <Bar dataKey="safe" name="Ngưỡng chuẩn an toàn" activeBar={false} fill="#94A3B8" opacity={0.3} radius={[8, 8, 0, 0]} />
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
              <h2 className="text-xl sm:text-2xl font-black text-[var(--text-primary)] tracking-tight">
                {t('map.title')}
              </h2>
              <p className="text-xs text-[var(--text-tertiary)] mt-1">
                {t('map.subtitle')}
              </p>
            </div>
            <button
              onClick={onNavigateToMaps}
              className="text-xs font-semibold px-4 py-2 rounded-xl bg-orange-700 hover:bg-orange-800 text-white shadow-sm flex items-center gap-1.5 self-start sm:self-auto transition-all active:scale-95 cursor-pointer"
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
            <div className="p-6 rounded-2xl bg-[var(--surface-card)] border border-[var(--border-default)] shadow-[var(--shadow-card)] space-y-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-sky-100 dark:bg-sky-950/60 text-sky-500">
                  <Clock className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-[var(--text-primary)]">
                  {t('insights.best_hours_title')}
                </h3>
              </div>

              <div className="space-y-2.5 text-xs">
                {BEST_OUTDOOR_HOURS.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 rounded-xl bg-[var(--surface-subtle)] flex items-center justify-between gap-2 hover:bg-[var(--surface-header)] transition-colors cursor-pointer"
                  >
                    <div>
                      <span className="font-bold text-[var(--text-primary)] block">{item.time}</span>
                      <span className="text-sm leading-6 text-[var(--text-secondary)]">{lang === 'vi' ? item.adviceVi : item.adviceEn}</span>
                    </div>
                    <AQIBadge aqi={item.aqi} size="sm" />
                  </div>
                ))}
              </div>
            </div>

            {/* Quick City Comparisons */}
            <div className="p-6 rounded-2xl bg-[var(--surface-card)] border border-[var(--border-default)] shadow-[var(--shadow-card)] space-y-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-orange-100 dark:bg-orange-950/60 text-orange-500">
                  <Activity className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-[var(--text-primary)]">
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
                      className="p-2.5 rounded-xl bg-[var(--surface-subtle)] flex items-center justify-between cursor-pointer hover:bg-orange-50/60 dark:hover:bg-orange-950/30 hover:scale-[1.02] transition-all"
                      title={`Nhấn để chuyển sang trạm ${c.city} / Click to view ${c.city} station`}
                    >
                      <div>
                        <span className="font-bold text-[var(--text-primary)]">{c.city}</span>
                        <span className="text-xs text-[var(--text-tertiary)] block">{c.temp}°C • PM2.5: {c.pm25}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span
                          className="font-bold text-xs px-2 py-0.5 rounded-md"
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
            <div className="p-6 rounded-2xl bg-[var(--surface-card)] border border-[var(--border-default)] shadow-[var(--shadow-card)] space-y-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-500">
                  <Leaf className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-[var(--text-primary)]">
                  {t('insights.tips_title')}
                </h3>
              </div>

              <div className="space-y-3 text-xs">
                {INDOOR_AIR_TIPS.map((tip, idx) => (
                  <div key={idx} className="space-y-1 p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors cursor-pointer">
                    <h4 className="font-bold text-[var(--text-primary)] flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      <span>{lang === 'vi' ? tip.titleVi : tip.titleEn}</span>
                    </h4>
                    <p className="text-sm leading-6 text-[var(--text-secondary)] pl-3">
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
