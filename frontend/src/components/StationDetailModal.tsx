import React from 'react';
import { AirStation, PollutantDetail } from '../types/airQuality.types';
import { getAQICategory } from '../utils/aqi.util';
import { formatDateTime } from '../utils/date.util';
import { useLanguage } from '../context/LanguageContext';
import { AQIBadge } from './AQIBadge';
import { X, MapPin, Wind, Thermometer, Droplets, Sun, Activity, ArrowUp, ArrowDown, Minus, ShieldAlert } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface StationDetailModalProps {
  station: AirStation | null;
  onClose: () => void;
}

export const StationDetailModal: React.FC<StationDetailModalProps> = ({ station, onClose }) => {
  const { lang, t } = useLanguage();

  if (!station) return null;

  const category = getAQICategory(station.aqi);

  const renderTrendIcon = (trend: 'up' | 'down' | 'stable') => {
    if (trend === 'up') return <ArrowUp className="w-3 h-3 text-red-500" />;
    if (trend === 'down') return <ArrowDown className="w-3 h-3 text-emerald-500" />;
    return <Minus className="w-3 h-3 text-slate-400" />;
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden p-6 sm:p-8 text-slate-900 dark:text-white max-h-[90vh] overflow-y-auto"
        >
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-5 right-5 p-2 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Station Header */}
          <div className="flex flex-wrap items-start justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                  {station.id}
                </span>
                <span className="text-xs text-slate-500 font-medium">{station.province}</span>
              </div>
              <h3 className="text-xl font-black text-slate-900 dark:text-white">{station.name}</h3>
              <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-1">
                <MapPin className="w-3.5 h-3.5 text-orange-500" />
                <span>{station.address}</span>
              </div>
            </div>

            <div className="flex flex-col items-end">
              <div
                className="text-3xl font-black px-4 py-2 rounded-2xl flex items-center gap-2 shadow-sm"
                style={{ backgroundColor: category.bgColor, color: category.color }}
              >
                <span>{Math.round(station.aqi)}</span>
                <span className="text-xs uppercase tracking-wider font-bold">AQI</span>
              </div>
              <div className="mt-1.5">
                <AQIBadge aqi={station.aqi} size="sm" />
              </div>
            </div>
          </div>

          {/* Health impact recommendation */}
          <div
            className="my-4 p-4 rounded-2xl border text-xs leading-relaxed"
            style={{
              backgroundColor: category.bgColor,
              borderColor: category.borderColor,
              color: category.textColor,
            }}
          >
            <div className="flex items-center gap-2 font-bold mb-1">
              <ShieldAlert className="w-4 h-4" />
              <span>{lang === 'vi' ? 'Khuyến cáo sức khỏe tại trạm này:' : 'Health advisory for this station:'}</span>
            </div>
            <p>{lang === 'vi' ? category.healthAdviceVi : category.healthAdviceEn}</p>
          </div>

          {/* Weather summary grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 my-4">
            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-800 flex items-center gap-3">
              <div className="p-2 rounded-xl bg-orange-100 dark:bg-orange-950/50 text-orange-500">
                <Thermometer className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[10px] text-slate-500 uppercase font-bold block">{t('hero.temp')}</span>
                <span className="text-sm font-bold text-slate-900 dark:text-white">{station.temperature}°C</span>
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-800 flex items-center gap-3">
              <div className="p-2 rounded-xl bg-sky-100 dark:bg-sky-950/50 text-sky-500">
                <Droplets className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[10px] text-slate-500 uppercase font-bold block">{t('hero.humidity')}</span>
                <span className="text-sm font-bold text-slate-900 dark:text-white">{station.humidity}%</span>
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-800 flex items-center gap-3">
              <div className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-950/50 text-emerald-500">
                <Wind className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[10px] text-slate-500 uppercase font-bold block">{t('hero.wind')}</span>
                <span className="text-sm font-bold text-slate-900 dark:text-white">{station.windSpeed} km/h</span>
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-800 flex items-center gap-3">
              <div className="p-2 rounded-xl bg-purple-100 dark:bg-purple-950/50 text-purple-500">
                <Activity className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[10px] text-slate-500 uppercase font-bold block">{t('hero.primary_pollutant')}</span>
                <span className="text-sm font-bold text-slate-900 dark:text-white">{station.primaryPollutant}</span>
              </div>
            </div>
          </div>

          {/* Detailed Pollutants Table */}
          <div className="mt-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2.5">
              {t('pollutants.title')}
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {(Object.entries(station.pollutants) as [string, PollutantDetail][]).map(([key, poll]) => {
                const isWarning = poll.value > poll.maxSafe;
                return (
                  <div
                    key={key}
                    className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 flex flex-col justify-between"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black uppercase text-slate-700 dark:text-slate-300">
                        {key === 'pm25' ? 'PM2.5' : key.toUpperCase()}
                      </span>
                      <div className="flex items-center gap-1 text-[10px]">
                        {renderTrendIcon(poll.trend)}
                        <span className={poll.trend === 'up' ? 'text-red-500' : poll.trend === 'down' ? 'text-emerald-500' : 'text-slate-400'}>
                          {poll.changePercent > 0 ? `+${poll.changePercent}%` : `${poll.changePercent}%`}
                        </span>
                      </div>
                    </div>

                    <div className="my-2">
                      <span className={`text-lg font-black ${isWarning ? 'text-red-500' : 'text-slate-900 dark:text-white'}`}>
                        {poll.value}
                      </span>
                      <span className="text-[11px] text-slate-500 ml-1">{poll.unit}</span>
                    </div>

                    <div className="text-[10px] text-slate-400 flex items-center justify-between pt-1 border-t border-slate-200 dark:border-slate-700/60">
                      <span>{t('pollutants.safe_limit')}:</span>
                      <span className="font-semibold">{poll.maxSafe} {poll.unit}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-400">
            <span>
              {t('hero.last_updated')}: {formatDateTime(station.lastUpdated, lang)}
            </span>
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-semibold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
            >
              Đóng
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
