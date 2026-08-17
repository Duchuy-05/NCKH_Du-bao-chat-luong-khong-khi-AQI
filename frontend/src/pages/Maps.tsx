import React, { useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { VIETNAM_STATIONS } from '../data/mockAirData';
import { AirStation } from '../types/airQuality.types';
import { VietnamMap } from '../components/VietnamMap';
import { AQIBadge } from '../components/AQIBadge';
import { getAQICategory } from '../utils/aqi.util';
import { FadeIn } from '../components/FadeIn';
import {
  Layers,
  Search,
  Sliders,
  Play,
  Pause,
  RotateCcw,
  MapPin,
  Thermometer,
  Wind,
  Droplets,
  Activity,
  ChevronRight
} from 'lucide-react';

interface MapsProps {
  onSelectStation: (station: AirStation) => void;
}

export const Maps: React.FC<MapsProps> = ({ onSelectStation }) => {
  const { lang, t } = useLanguage();
  const [selectedStation, setSelectedStation] = useState<AirStation>(VIETNAM_STATIONS[0]);
  const [activeLayer, setActiveLayer] = useState<'aqi' | 'pm25' | 'temp' | 'wind'>('aqi');
  const [searchStation, setSearchStation] = useState('');
  const [isPlaying, setIsPlaying] = useState(false);
  const [timeHour, setTimeHour] = useState(8);

  const filteredStations = VIETNAM_STATIONS.filter((s) =>
    s.name.toLowerCase().includes(searchStation.toLowerCase()) ||
    s.province.toLowerCase().includes(searchStation.toLowerCase()) ||
    s.id.toLowerCase().includes(searchStation.toLowerCase())
  );

  const togglePlayback = () => {
    setIsPlaying(!isPlaying);
  };

  return (
    <div className="w-full space-y-6 pb-20">
      <FadeIn direction="up">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              {lang === 'vi' ? 'Bản đồ Quan trắc Không khí Toàn quốc' : 'National Air Quality Monitoring Map'}
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              {lang === 'vi'
                ? 'Dữ liệu thời gian thực từ mạng lưới trạm quan trắc chuẩn hóa khắp các tỉnh thành Việt Nam'
                : 'Real-time environmental sensor data across all Vietnamese provinces'}
            </p>
          </div>

          {/* Layer Selector Chips */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-2xl self-start sm:self-auto">
            <button
              onClick={() => setActiveLayer('aqi')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeLayer === 'aqi'
                  ? 'bg-white dark:bg-slate-900 text-orange-500 shadow-sm'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              AQI VN
            </button>
            <button
              onClick={() => setActiveLayer('pm25')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeLayer === 'pm25'
                  ? 'bg-white dark:bg-slate-900 text-orange-500 shadow-sm'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              PM2.5
            </button>
            <button
              onClick={() => setActiveLayer('temp')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeLayer === 'temp'
                  ? 'bg-white dark:bg-slate-900 text-orange-500 shadow-sm'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {lang === 'vi' ? 'Nhiệt độ' : 'Temperature'}
            </button>
            <button
              onClick={() => setActiveLayer('wind')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeLayer === 'wind'
                  ? 'bg-white dark:bg-slate-900 text-orange-500 shadow-sm'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {lang === 'vi' ? 'Gió' : 'Wind'}
            </button>
          </div>
        </div>

        {/* Main Map + Sidebar Workspace Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-6">
          {/* Left / Center Map Area */}
          <div className="lg:col-span-8 space-y-4">
            <div className="rounded-3xl overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-800">
              <VietnamMap
                stations={VIETNAM_STATIONS}
                selectedStation={selectedStation}
                onSelectStation={(st) => {
                  setSelectedStation(st);
                  onSelectStation(st);
                }}
                heightClass="h-[600px]"
                activeLayer={activeLayer}
                showControls={true}
              />
            </div>

            {/* Time Slider & Playback Controller */}
            <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row items-center gap-4">
              <div className="flex items-center gap-2">
                <button
                  onClick={togglePlayback}
                  className="p-2.5 rounded-xl bg-orange-500 text-white hover:bg-orange-600 shadow transition-transform active:scale-95 cursor-pointer"
                >
                  {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                </button>
                <button
                  onClick={() => setTimeHour(8)}
                  className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                  title="Đặt lại"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              </div>

              <div className="flex-1 w-full space-y-1">
                <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
                  <span>{lang === 'vi' ? 'Khung thời gian trong ngày' : 'Time Slider'}</span>
                  <span className="text-orange-500 font-black">{String(timeHour).padStart(2, '0')}:00</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="23"
                  value={timeHour}
                  onChange={(e) => setTimeHour(Number(e.target.value))}
                  className="w-full accent-orange-500 h-2 bg-slate-200 dark:bg-slate-800 rounded-lg cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-400 font-medium">
                  <span>00:00</span>
                  <span>06:00</span>
                  <span>12:00</span>
                  <span>18:00</span>
                  <span>23:00</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Stations List & Quick Filter Sidebar */}
          <div className="lg:col-span-4 space-y-4">
            <div className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl flex flex-col h-[676px]">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  {lang === 'vi' ? 'Danh sách trạm quan trắc' : 'Monitoring Stations'}
                </h3>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                  {filteredStations.length} {lang === 'vi' ? 'trạm' : 'stations'}
                </span>
              </div>

              {/* Station Search Input */}
              <div className="relative mb-3">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchStation}
                  onChange={(e) => setSearchStation(e.target.value)}
                  placeholder={lang === 'vi' ? 'Tìm theo tên trạm hoặc tỉnh...' : 'Filter by station name or city...'}
                  className="w-full bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-orange-500 transition-colors"
                />
              </div>

              {/* Scrollable Station Cards */}
              <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
                {filteredStations.map((st) => {
                  const isSelected = selectedStation.id === st.id;
                  const cat = getAQICategory(st.aqi);
                  return (
                    <div
                      key={st.id}
                      onClick={() => {
                        setSelectedStation(st);
                        onSelectStation(st);
                      }}
                      className={`p-3.5 rounded-2xl cursor-pointer transition-all border ${
                        isSelected
                          ? 'border-orange-500 bg-orange-50/50 dark:bg-orange-950/30 shadow-sm'
                          : 'border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-800/30 hover:bg-slate-100 dark:hover:bg-slate-800/70'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                            {st.province} • {st.id}
                          </span>
                          <h4 className="text-xs font-bold text-slate-900 dark:text-white line-clamp-1 mt-0.5">
                            {st.name}
                          </h4>
                        </div>
                        <div
                          className="px-2 py-0.5 rounded-lg text-xs font-black shrink-0"
                          style={{ backgroundColor: cat.bgColor, color: cat.color }}
                        >
                          {Math.round(st.aqi)}
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-slate-500 mt-2 pt-2 border-t border-slate-200/60 dark:border-slate-800">
                        <AQIBadge aqi={st.aqi} size="sm" />
                        <span>{st.temperature}°C • {st.humidity}% ẩm</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </FadeIn>
    </div>
  );
};
