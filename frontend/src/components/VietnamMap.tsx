import React, { useState } from 'react';
import { AirStation } from '../types/airQuality.types';
import { getAQICategory } from '../utils/aqi.util';
import { useLanguage } from '../context/LanguageContext';
import { AQIBadge } from './AQIBadge';
import { MapPin, Wind, Thermometer, Droplets, ArrowUpRight, ZoomIn, ZoomOut, Layers } from 'lucide-react';

interface VietnamMapProps {
  stations: AirStation[];
  selectedStation: AirStation | null;
  onSelectStation: (station: AirStation) => void;
  heightClass?: string;
  onOpenFullMap?: () => void;
  activeLayer?: 'aqi' | 'pm25' | 'temp' | 'wind';
  showControls?: boolean;
  id?: string;
}

export const VietnamMap: React.FC<VietnamMapProps> = ({
  stations,
  selectedStation,
  onSelectStation,
  heightClass = 'h-[540px]',
  onOpenFullMap,
  activeLayer = 'aqi',
  showControls = true,
  id,
}) => {
  const { lang, t } = useLanguage();
  const [hoveredStation, setHoveredStation] = useState<AirStation | null>(null);
  const [regionFilter, setRegionFilter] = useState<'All' | 'Bac' | 'Trung' | 'Nam'>('All');
  const [zoomLevel, setZoomLevel] = useState(1);

  const filteredStations = stations.filter((s) => {
    if (regionFilter === 'All') return true;
    return s.region === regionFilter;
  });

  const getStationColor = (st: AirStation) => {
    if (activeLayer === 'temp') {
      if (st.temperature > 32) return '#EF4444';
      if (st.temperature > 28) return '#F59E0B';
      return '#38BDF8';
    }
    if (activeLayer === 'pm25') {
      const pm25 = st.pollutants.pm25.value;
      if (pm25 > 50) return '#EF4444';
      if (pm25 > 35) return '#F97316';
      if (pm25 > 15) return '#F59E0B';
      return '#10B981';
    }
    if (activeLayer === 'wind') {
      return '#0284C7';
    }
    return getAQICategory(st.aqi).color;
  };

  return (
    <div
      id={id || 'vietnam-interactive-map'}
      className={`relative w-full rounded-2xl overflow-hidden bg-slate-900 border border-slate-800 shadow-xl flex flex-col ${heightClass}`}
    >
      {/* Top Map Control Bar */}
      <div className="absolute top-4 left-4 right-4 z-20 flex flex-wrap items-center justify-between gap-2 pointer-events-none">
        {/* Region Filter Chips */}
        <div className="pointer-events-auto flex items-center gap-1.5 bg-slate-900/80 backdrop-blur-md p-1 rounded-xl border border-slate-700/80 shadow-md">
          {(['All', 'Bac', 'Trung', 'Nam'] as const).map((r) => {
            const labelKey = r === 'All' ? 'map.filter_all' : r === 'Bac' ? 'map.filter_bac' : r === 'Trung' ? 'map.filter_trung' : 'map.filter_nam';
            return (
              <button
                key={r}
                onClick={() => setRegionFilter(r)}
                className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer ${
                  regionFilter === r
                    ? 'bg-sky-500 text-white shadow-sm font-semibold'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800'
                }`}
              >
                {t(labelKey)}
              </button>
            );
          })}
        </div>

        {/* Map Actions & Legend Quick Info */}
        <div className="pointer-events-auto flex items-center gap-2">
          {showControls && (
            <div className="flex items-center bg-slate-900/80 backdrop-blur-md p-1 rounded-xl border border-slate-700/80 shadow-md">
              <button
                onClick={() => setZoomLevel((z) => Math.min(1.4, z + 0.15))}
                className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                title="Phóng to"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
              <button
                onClick={() => setZoomLevel((z) => Math.max(0.9, z - 0.15))}
                className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                title="Thu nhỏ"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
            </div>
          )}

          {onOpenFullMap && (
            <button
              onClick={onOpenFullMap}
              className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white shadow-md transition-all active:scale-95 cursor-pointer"
            >
              <span>{t('map.view_full')}</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* SVG Map Canvas */}
      <div className="relative flex-1 w-full h-full overflow-hidden flex items-center justify-center p-2 sm:p-4">
        {/* Subtle Grid Background */}
        <div
          className="absolute inset-0 opacity-15"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, #38BDF8 1px, transparent 0)`,
            backgroundSize: '24px 24px',
          }}
        />

        <div
          className="relative w-full max-w-[620px] h-full max-h-[640px] transition-transform duration-300 ease-out select-none"
          style={{ transform: `scale(${zoomLevel})` }}
        >
          {/* Vietnam SVG Map - Accurate Cartographic Silhouette matching /src/assets/vietnam-map.svg */}
          <svg
            viewBox="0 0 800 1000"
            className="w-full h-full filter drop-shadow-[0_10px_35px_rgba(0,0,0,0.7)]"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              {/* Mainland Gradient Fill */}
              <linearGradient id="vnMainlandGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#1e3a5f" />
                <stop offset="50%" stopColor="#172b47" />
                <stop offset="100%" stopColor="#0f1f38" />
              </linearGradient>

              {/* Glow Filter */}
              <filter id="vnGlow" x="-10%" y="-10%" width="120%" height="120%">
                <feDropShadow dx="0" dy="4" stdDeviation="6" floodColor="#38BDF8" floodOpacity="0.25" />
              </filter>

              <pattern id="diagonalHatch" width="12" height="12" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
                <line x1="0" y1="0" x2="0" y2="12" stroke="#38BDF8" strokeWidth="0.6" strokeOpacity="0.1" />
              </pattern>
            </defs>

            {/* Maritime Zones & Grid Lines */}
            <g opacity="0.35" stroke="#38BDF8" strokeWidth="0.6" strokeDasharray="4 4">
              <line x1="60" y1="180" x2="740" y2="180" />
              <line x1="60" y1="360" x2="740" y2="360" />
              <line x1="60" y1="540" x2="740" y2="540" />
              <line x1="60" y1="720" x2="740" y2="720" />
              <line x1="60" y1="900" x2="740" y2="900" />
              <line x1="200" y1="60" x2="200" y2="960" />
              <line x1="400" y1="60" x2="400" y2="960" />
              <line x1="600" y1="60" x2="600" y2="960" />
            </g>

            {/* Geographic Coordinates Labeling */}
            <g fill="#64748B" fontSize="10" fontWeight="600" opacity="0.6" letterSpacing="0.5">
              <text x="70" y="174">22°N</text>
              <text x="70" y="354">18°N</text>
              <text x="70" y="534">14°N</text>
              <text x="70" y="714">10°N</text>
              <text x="204" y="955">104°E</text>
              <text x="404" y="955">108°E</text>
              <text x="604" y="955">112°E</text>
            </g>

            {/* Sea Zone Water Body Hatching */}
            <path
              d="M 180 60 L 740 60 L 740 960 L 120 960 L 120 780 L 220 700 Z"
              fill="url(#diagonalHatch)"
            />

            {/* Regional Atmospheric Heat Aura (AQI Hotspots) */}
            <circle cx="380" cy="200" r="65" fill="rgba(239, 68, 68, 0.12)" filter="blur(20px)" />
            <circle cx="485" cy="480" r="50" fill="rgba(56, 189, 248, 0.10)" filter="blur(16px)" />
            <circle cx="440" cy="780" r="70" fill="rgba(249, 115, 22, 0.12)" filter="blur(22px)" />

            {/* ========================================================= */}
            {/* VIETNAM MAINLAND - ACCURATE GEOGRAPHIC SILHOUETTE         */}
            {/* ========================================================= */}
            <g filter="url(#vnGlow)">
              <path
                id="vietnam-mainland"
                d="
                  M 315 72
                  C 330 65, 350 60, 368 62
                  C 382 64, 395 72, 408 80
                  C 420 88, 435 94, 446 108
                  C 455 120, 442 128, 430 134
                  C 420 140, 428 152, 440 156
                  C 452 160, 468 155, 478 165
                  C 488 175, 492 188, 475 198
                  C 460 206, 448 214, 435 224
                  C 424 232, 415 245, 400 252
                  C 388 258, 375 250, 362 256
                  C 350 262, 345 275, 348 288
                  C 352 302, 365 315, 372 330
                  C 380 345, 395 360, 405 375
                  C 415 390, 428 408, 442 425
                  C 456 442, 470 460, 482 480
                  C 494 500, 506 520, 515 542
                  C 524 564, 532 588, 535 612
                  C 538 636, 534 660, 526 682
                  C 518 704, 505 722, 490 738
                  C 475 754, 460 768, 445 780
                  C 432 790, 420 802, 410 818
                  C 400 834, 392 850, 382 866
                  C 372 882, 360 898, 350 914
                  C 340 930, 330 946, 320 958
                  C 310 970, 298 962, 292 950
                  C 286 938, 295 924, 305 910
                  C 315 896, 328 880, 338 862
                  C 348 844, 356 824, 360 804
                  C 364 784, 368 762, 365 740
                  C 362 718, 352 696, 342 675
                  C 332 654, 320 632, 310 610
                  C 300 588, 290 565, 282 542
                  C 274 519, 268 495, 262 470
                  C 256 445, 248 420, 240 395
                  C 232 370, 222 345, 215 320
                  C 208 295, 202 270, 200 245
                  C 198 220, 202 195, 212 172
                  C 222 149, 240 130, 258 114
                  C 276 98, 298 82, 315 72 Z
                "
                fill="url(#vnMainlandGrad)"
                stroke="#38BDF8"
                strokeWidth="2.5"
                strokeLinejoin="round"
                className="transition-colors hover:brightness-110 cursor-pointer"
              />

              {/* Northern West & East border natural contours */}
              <path
                d="
                  M 315 72
                  C 290 85, 260 95, 238 115
                  C 216 135, 202 160, 212 185
                  C 222 210, 245 200, 265 215
                  C 285 230, 295 255, 320 262
                  C 335 248, 345 230, 360 220
                  C 375 210, 395 205, 385 180
                  C 375 155, 355 130, 335 110
                  C 325 98, 318 85, 315 72 Z
                "
                fill="url(#vnMainlandGrad)"
                stroke="#38BDF8"
                strokeWidth="2"
                strokeLinejoin="round"
              />

              {/* Southern Mekong Delta & Ca Mau Peninsula */}
              <path
                d="
                  M 350 914
                  C 345 932, 336 950, 326 962
                  C 316 974, 302 982, 290 970
                  C 278 958, 285 940, 296 925
                  C 307 910, 322 895, 338 880
                  C 352 892, 350 904, 350 914 Z
                "
                fill="url(#vnMainlandGrad)"
                stroke="#38BDF8"
                strokeWidth="2"
                strokeLinejoin="round"
              />
            </g>

            {/* ========================================================= */}
            {/* QUẦN ĐẢO HOÀNG SA (VIỆT NAM) - PARACEL ARCHIPELAGO       */}
            {/* ========================================================= */}
            <g id="hoang-sa-archipelago" className="cursor-pointer group">
              {/* Island Cluster matching user image */}
              <circle cx="560" cy="420" r="5" fill="#38BDF8" className="animate-pulse" />
              <circle cx="576" cy="428" r="4" fill="#38BDF8" />
              <circle cx="552" cy="440" r="4.5" fill="#38BDF8" />
              <circle cx="590" cy="448" r="3.5" fill="#38BDF8" />
              <circle cx="572" cy="460" r="4" fill="#38BDF8" />
              <circle cx="545" cy="458" r="3.5" fill="#38BDF8" />
              <circle cx="585" cy="472" r="4" fill="#38BDF8" />
              <circle cx="600" cy="440" r="3" fill="#38BDF8" />
              <circle cx="565" cy="482" r="3" fill="#38BDF8" />
              <circle cx="605" cy="465" r="3.5" fill="#38BDF8" />
              <circle cx="550" cy="488" r="3" fill="#38BDF8" />

              {/* Archipelago Boundary */}
              <ellipse cx="575" cy="455" rx="48" ry="42" stroke="#38BDF8" strokeWidth="1.2" strokeDasharray="4 4" fill="rgba(56,189,248,0.08)" opacity="0.8" />

              {/* Sovereignty Title Box */}
              <g transform="translate(505, 375)">
                <rect x="0" y="0" width="165" height="26" rx="8" fill="#020617" stroke="#38BDF8" strokeWidth="1.5" opacity="0.95" />
                <text x="82.5" y="17" fill="#F8FAFC" fontSize="11" fontWeight="800" textAnchor="middle" letterSpacing="0.5">
                  ★ QĐ. HOÀNG SA (VN)
                </text>
              </g>
            </g>

            {/* ========================================================= */}
            {/* QUẦN ĐẢO TRƯỜNG SA (VIỆT NAM) - SPRATLY ARCHIPELAGO      */}
            {/* ========================================================= */}
            <g id="truong-sa-archipelago" className="cursor-pointer group">
              {/* Island Cluster matching user image */}
              <circle cx="610" cy="730" r="5" fill="#38BDF8" className="animate-pulse" />
              <circle cx="628" cy="748" r="4" fill="#38BDF8" />
              <circle cx="595" cy="762" r="4.5" fill="#38BDF8" />
              <circle cx="645" cy="770" r="4" fill="#38BDF8" />
              <circle cx="618" cy="795" r="5" fill="#38BDF8" />
              <circle cx="585" cy="815" r="3.5" fill="#38BDF8" />
              <circle cx="635" cy="828" r="4" fill="#38BDF8" />
              <circle cx="605" cy="850" r="4.5" fill="#38BDF8" />
              <circle cx="660" cy="805" r="3.5" fill="#38BDF8" />
              <circle cx="650" cy="845" r="4" fill="#38BDF8" />
              <circle cx="620" cy="875" r="4" fill="#38BDF8" />
              <circle cx="575" cy="840" r="3.5" fill="#38BDF8" />
              <circle cx="590" cy="895" r="4" fill="#38BDF8" />
              <circle cx="640" cy="890" r="3.5" fill="#38BDF8" />
              <circle cx="610" cy="920" r="4" fill="#38BDF8" />
              <circle cx="550" cy="915" r="3" fill="#38BDF8" />
              <circle cx="570" cy="940" r="3.5" fill="#38BDF8" />
              <circle cx="630" cy="945" r="3.5" fill="#38BDF8" />
              <circle cx="600" cy="960" r="3" fill="#38BDF8" />

              {/* Archipelago Boundary */}
              <ellipse cx="615" cy="845" rx="65" ry="85" stroke="#38BDF8" strokeWidth="1.2" strokeDasharray="4 4" fill="rgba(56,189,248,0.08)" opacity="0.8" />

              {/* Sovereignty Title Box */}
              <g transform="translate(530, 680)">
                <rect x="0" y="0" width="168" height="26" rx="8" fill="#020617" stroke="#38BDF8" strokeWidth="1.5" opacity="0.95" />
                <text x="84" y="17" fill="#F8FAFC" fontSize="11" fontWeight="800" textAnchor="middle" letterSpacing="0.5">
                  ★ QĐ. TRƯỜNG SA (VN)
                </text>
              </g>
            </g>

            {/* ========================================================= */}
            {/* OTHER KEY ISLANDS (PHÚ QUỐC, CÔN ĐẢO, LÝ SƠN, PHÚ QUÝ)  */}
            {/* ========================================================= */}
            {/* Đảo Phú Quốc */}
            <g id="dao-phu-quoc" className="cursor-pointer">
              <ellipse cx="260" cy="880" rx="10" ry="18" fill="url(#vnMainlandGrad)" stroke="#38BDF8" strokeWidth="2" transform="rotate(-15 260 880)" />
              <text x="205" y="885" fill="#E2E8F0" fontSize="11" fontWeight="700">Đ. Phú Quốc</text>
            </g>

            {/* Côn Đảo */}
            <g id="con-dao" className="cursor-pointer">
              <ellipse cx="390" cy="940" rx="7" ry="10" fill="url(#vnMainlandGrad)" stroke="#38BDF8" strokeWidth="1.8" transform="rotate(30 390 940)" />
              <text x="405" y="945" fill="#E2E8F0" fontSize="10" fontWeight="700">Côn Đảo</text>
            </g>

            {/* Đảo Phú Quý */}
            <g id="dao-phu-quy" className="cursor-pointer">
              <circle cx="490" cy="775" r="4.5" fill="#38BDF8" />
              <text x="502" y="778" fill="#CBD5E1" fontSize="9" fontWeight="600">Phú Quý</text>
            </g>

            {/* Đảo Lý Sơn */}
            <g id="dao-ly-son" className="cursor-pointer">
              <circle cx="475" cy="540" r="4.5" fill="#38BDF8" />
              <text x="488" y="543" fill="#CBD5E1" fontSize="9" fontWeight="600">Lý Sơn</text>
            </g>

            {/* Đảo Cồn Cỏ */}
            <g id="dao-con-co" className="cursor-pointer">
              <circle cx="395" cy="385" r="3.5" fill="#38BDF8" />
              <text x="405" y="388" fill="#CBD5E1" fontSize="8" fontWeight="600">Cồn Cỏ</text>
            </g>

            {/* Bạch Long Vĩ */}
            <g id="bach-long-vi" className="cursor-pointer">
              <circle cx="485" cy="225" r="4" fill="#38BDF8" />
              <text x="495" y="228" fill="#CBD5E1" fontSize="9" fontWeight="600">Bạch Long Vĩ</text>
            </g>

            {/* Sea Geography Watermark Labels */}
            <text x="510" y="590" fill="#38BDF8" opacity="0.16" fontSize="32" fontWeight="900" letterSpacing="6">
              BIỂN ĐÔNG
            </text>
            <text x="390" y="270" fill="#38BDF8" opacity="0.14" fontSize="16" fontWeight="800" letterSpacing="2">
              VỊNH BẮC BỘ
            </text>
            <text x="180" y="820" fill="#38BDF8" opacity="0.14" fontSize="16" fontWeight="800" letterSpacing="2">
              VỊNH THÁI LAN
            </text>
          </svg>

          {/* Interactive Station Markers */}
          {filteredStations.map((st) => {
            const isSelected = selectedStation?.id === st.id;
            const isHovered = hoveredStation?.id === st.id;
            const color = getStationColor(st);

            return (
              <div
                key={st.id}
                style={{
                  left: `${st.mapX}%`,
                  top: `${st.mapY}%`,
                }}
                className="absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer z-10 transition-transform duration-200"
                onClick={() => onSelectStation(st)}
                onMouseEnter={() => setHoveredStation(st)}
                onMouseLeave={() => setHoveredStation(null)}
              >
                {/* Pulse Ring for high AQI */}
                {st.aqi > 100 && (
                  <div
                    className="absolute inset-0 rounded-full animate-pulse-ring"
                    style={{ backgroundColor: color }}
                  />
                )}

                {/* Main Station Bubble */}
                <div
                  style={{
                    backgroundColor: color,
                    borderColor: isSelected ? '#FFFFFF' : 'rgba(255,255,255,0.8)',
                  }}
                  className={`relative flex items-center justify-center rounded-full text-white font-black shadow-xl transition-all ${
                    isSelected
                      ? 'w-9 h-9 text-xs ring-4 ring-orange-500 scale-125 z-30'
                      : isHovered
                      ? 'w-8 h-8 text-[11px] scale-110 z-20'
                      : 'w-7 h-7 text-[10px]'
                  } border-2`}
                >
                  {activeLayer === 'temp'
                    ? `${Math.round(st.temperature)}°`
                    : activeLayer === 'pm25'
                    ? Math.round(st.pollutants.pm25.value)
                    : activeLayer === 'wind'
                    ? Math.round(st.windSpeed)
                    : Math.round(st.aqi)}
                </div>

                {/* Tiny Province Label Tag */}
                <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 whitespace-nowrap px-1.5 py-0.5 rounded-md bg-slate-950/90 text-[9px] font-bold text-slate-200 shadow-md border border-slate-700/50 pointer-events-none">
                  {st.province}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Floating Hover / Selection Card */}
      {(hoveredStation || selectedStation) && (
        <div
          onClick={() => {
            const st = hoveredStation || selectedStation!;
            onSelectStation(st);
          }}
          className="absolute bottom-4 left-4 right-4 md:right-auto md:w-80 z-30 bg-slate-900/95 backdrop-blur-md p-3.5 rounded-xl border border-slate-700 shadow-2xl text-white cursor-pointer hover:border-orange-500 transition-colors"
          title="Nhấn để xem chi tiết thông số trạm / Click to view station details"
        >
          {(() => {
            const st = hoveredStation || selectedStation!;
            const category = getAQICategory(st.aqi);
            return (
              <div>
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <div>
                    <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                      {st.province} • {st.id}
                    </span>
                    <h4 className="text-sm font-bold text-white line-clamp-1">{st.name}</h4>
                  </div>
                  <AQIBadge aqi={st.aqi} size="sm" />
                </div>

                <div className="grid grid-cols-3 gap-2 mt-2 pt-2 border-t border-slate-800 text-xs">
                  <div className="bg-slate-800/60 p-1.5 rounded-lg text-center">
                    <span className="text-[10px] text-slate-400 block">PM2.5</span>
                    <span className="font-bold text-orange-400">{st.pollutants.pm25.value}</span>
                    <span className="text-[9px] text-slate-500 block">µg/m³</span>
                  </div>
                  <div className="bg-slate-800/60 p-1.5 rounded-lg text-center">
                    <span className="text-[10px] text-slate-400 block">Nhiệt độ</span>
                    <span className="font-bold text-sky-400">{st.temperature}°C</span>
                    <span className="text-[9px] text-slate-500 block">{st.humidity}% ẩm</span>
                  </div>
                  <div className="bg-slate-800/60 p-1.5 rounded-lg text-center">
                    <span className="text-[10px] text-slate-400 block">Gió</span>
                    <span className="font-bold text-emerald-400">{st.windSpeed}</span>
                    <span className="text-[9px] text-slate-500 block">km/h</span>
                  </div>
                </div>

                <div className="mt-2.5 flex items-center justify-between text-[11px] text-slate-300">
                  <span className="truncate">{lang === 'vi' ? category.descriptionVi : category.descriptionEn}</span>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* Bottom Color Scale Bar */}
      <div className="p-3 bg-slate-950/90 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs">
        <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
          {t('map.legend_title')}
        </span>
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="inline-flex items-center gap-1 text-[11px] text-slate-300">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> 0-50 {lang === 'vi' ? 'Tốt' : 'Good'}
          </span>
          <span className="inline-flex items-center gap-1 text-[11px] text-slate-300">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span> 51-100 {lang === 'vi' ? 'TB' : 'Mod'}
          </span>
          <span className="inline-flex items-center gap-1 text-[11px] text-slate-300">
            <span className="w-2.5 h-2.5 rounded-full bg-orange-500"></span> 101-150 {lang === 'vi' ? 'Kém' : 'Sens'}
          </span>
          <span className="inline-flex items-center gap-1 text-[11px] text-slate-300">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500"></span> 151-200 {lang === 'vi' ? 'Xấu' : 'Unhealthy'}
          </span>
          <span className="inline-flex items-center gap-1 text-[11px] text-slate-300">
            <span className="w-2.5 h-2.5 rounded-full bg-purple-500"></span> 201-300 {lang === 'vi' ? 'Rất xấu' : 'Very Unhealthy'}
          </span>
          <span className="inline-flex items-center gap-1 text-[11px] text-slate-300">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-950"></span> &gt;300 {lang === 'vi' ? 'Nguy hại' : 'Haz'}
          </span>
        </div>
      </div>
    </div>
  );
};
