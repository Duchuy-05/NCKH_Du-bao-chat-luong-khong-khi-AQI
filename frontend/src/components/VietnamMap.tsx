import React, { useState, useRef } from 'react';
import { AirStation } from '../types/airQuality.types';
import { getAQICategory } from '../utils/aqi.util';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
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
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [hoveredStation, setHoveredStation] = useState<AirStation | null>(null);
  const [regionFilter, setRegionFilter] = useState<'All' | 'Bac' | 'Trung' | 'Nam'>('All');
  const [zoomLevel, setZoomLevel] = useState(1);
  // --- Hiệu ứng kéo (drag) bản đồ ---
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0, panX: 0, panY: 0 });

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    dragStart.current = { x: e.clientX, y: e.clientY, panX: pan.x, panY: pan.y };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    const dx = e.clientX - dragStart.current.x;
    const dy = e.clientY - dragStart.current.y;
    setPan({ x: dragStart.current.panX + dx, y: dragStart.current.panY + dy });
  };

  const handleMouseUp = () => setIsDragging(false);

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
      className={`relative w-full rounded-2xl overflow-hidden bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl flex flex-col transition-colors ${heightClass}`}
    >
      {/* Top Map Control Bar */}
      <div className="absolute top-4 left-4 right-4 z-20 flex flex-wrap items-center justify-between gap-2 pointer-events-none">
        {/* Region Filter Chips */}
        <div className="pointer-events-auto flex items-center gap-1.5 bg-white/90 dark:bg-slate-900/80 backdrop-blur-md p-1 rounded-xl border border-slate-200 dark:border-slate-700/80 shadow-md">
          {(['All', 'Bac', 'Trung', 'Nam'] as const).map((r) => {
            const labelKey = r === 'All' ? 'map.filter_all' : r === 'Bac' ? 'map.filter_bac' : r === 'Trung' ? 'map.filter_trung' : 'map.filter_nam';
            return (
              <button
                key={r}
                onClick={() => setRegionFilter(r)}
                className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer ${
                  regionFilter === r
                    ? 'bg-sky-500 text-white shadow-sm font-semibold'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
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
            <div className="flex items-center bg-white/90 dark:bg-slate-900/80 backdrop-blur-md p-1 rounded-xl border border-slate-200 dark:border-slate-700/80 shadow-md">
              <button
                onClick={() => setZoomLevel((z) => Math.min(1.4, z + 0.15))}
                className="p-1.5 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                title="Phóng to"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
              <button
                onClick={() => setZoomLevel((z) => Math.max(0.9, z - 0.15))}
                className="p-1.5 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
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
      <div
        className="relative flex-1 w-full h-full overflow-hidden flex items-center justify-center p-2 sm:p-4"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
      >
        {/* Subtle Grid Background */}
        <div
          className="absolute inset-0 opacity-15"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, ${isDark ? '#38BDF8' : '#0284C7'} 1px, transparent 0)`,
            backgroundSize: '24px 24px',
          }}
        />

        <div
          className="relative h-full max-h-[640px] w-auto aspect-[9/10] transition-transform duration-300 ease-out select-none"
          style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoomLevel})` }}
        >
          {/* Vietnam SVG Map - Accurate Cartographic Silhouette matching /src/assets/vietnam-map.svg */}
          <svg
            viewBox="0 0 900 1000"
            className="w-full h-full filter drop-shadow-[0_10px_35px_rgba(0,0,0,0.15)] dark:drop-shadow-[0_10px_35px_rgba(0,0,0,0.7)]"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              {/* Mainland Gradient Fill (Dark) */}
              <linearGradient id="vnMainlandGradDark" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#1e3a5f" />
                <stop offset="50%" stopColor="#172b47" />
                <stop offset="100%" stopColor="#0f1f38" />
              </linearGradient>

              {/* Mainland Gradient Fill (Light) */}
              <linearGradient id="vnMainlandGradLight" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#e0f2fe" />
                <stop offset="50%" stopColor="#bae6fd" />
                <stop offset="100%" stopColor="#93c5fd" />
              </linearGradient>

              {/* Glow Filter */}
              <filter id="vnGlow" x="-10%" y="-10%" width="120%" height="120%">
                <feDropShadow dx="0" dy="4" stdDeviation="6" floodColor={isDark ? '#38BDF8' : '#0284C7'} floodOpacity={isDark ? 0.25 : 0.2} />
              </filter>

              <pattern id="diagonalHatch" width="12" height="12" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
                <line x1="0" y1="0" x2="0" y2="12" stroke={isDark ? '#38BDF8' : '#0284C7'} strokeWidth="0.6" strokeOpacity={isDark ? 0.1 : 0.12} />
              </pattern>
            </defs>

            {/* Maritime Zones & Grid Lines */}
            <g opacity={isDark ? 0.35 : 0.2} stroke={isDark ? '#38BDF8' : '#0284C7'} strokeWidth="0.6" strokeDasharray="4 4">
              <line x1="60" y1="180" x2="840" y2="180" />
              <line x1="60" y1="360" x2="840" y2="360" />
              <line x1="60" y1="540" x2="840" y2="540" />
              <line x1="60" y1="720" x2="840" y2="720" />
              <line x1="60" y1="900" x2="840" y2="900" />
              <line x1="200" y1="60" x2="200" y2="960" />
              <line x1="400" y1="60" x2="400" y2="960" />
              <line x1="600" y1="60" x2="600" y2="960" />
              <line x1="800" y1="60" x2="800" y2="960" />
            </g>

            {/* Geographic Coordinates Labeling */}
            <g fill={isDark ? '#64748B' : '#64748B'} fontSize="10" fontWeight="600" opacity="0.7" letterSpacing="0.5">
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
              d="M 180 60 L 840 60 L 840 960 L 120 960 L 120 780 L 220 700 Z"
              fill="url(#diagonalHatch)"
            />

            {/* Regional Atmospheric Heat Aura (AQI Hotspots) */}
            <circle cx="380" cy="200" r="65" fill={isDark ? 'rgba(239, 68, 68, 0.12)' : 'rgba(239, 68, 68, 0.08)'} filter="blur(20px)" />
            <circle cx="485" cy="480" r="50" fill={isDark ? 'rgba(56, 189, 248, 0.10)' : 'rgba(2, 132, 199, 0.08)'} filter="blur(16px)" />
            <circle cx="440" cy="780" r="70" fill={isDark ? 'rgba(249, 115, 22, 0.12)' : 'rgba(249, 115, 22, 0.08)'} filter="blur(22px)" />

            {/* ========================================================= */}
            {/* VIETNAM MAINLAND - ACCURATE GEOGRAPHIC SILHOUETTE         */}
            {/* ========================================================= */}
            <g filter="url(#vnGlow)">
              <path
                id="vietnam-mainland"
                d="M 372.3 40.0 C 365.5 36.2, 370.5 45.0, 365.5 48.1 C 360.6 51.3, 346.2 55.3, 342.6 58.9 C 339.0 62.5, 345.0 66.6, 343.9 69.7 C 342.8 72.9, 338.5 76.7, 335.8 77.8 C 333.1 79.0, 330.9 75.1, 327.7 76.5 C 324.5 77.8, 319.8 85.7, 316.9 85.9 C 314.0 86.2, 313.3 78.7, 310.1 77.8 C 307.0 76.9, 300.9 77.4, 298.0 80.5 C 295.0 83.7, 296.6 96.8, 292.6 96.8 C 288.5 96.8, 278.6 81.7, 273.6 80.5 C 268.7 79.4, 266.2 90.2, 262.8 90.0 C 259.5 89.8, 257.9 77.2, 253.4 79.2 C 248.9 81.2, 241.7 100.8, 235.8 102.2 C 230.0 103.5, 224.1 90.7, 218.2 87.3 C 212.4 83.9, 206.5 79.2, 200.7 81.9 C 194.8 84.6, 185.6 98.3, 183.1 103.5 C 180.6 108.7, 181.5 107.6, 185.8 113.0 C 190.1 118.4, 204.3 129.4, 208.8 135.9 C 213.3 142.5, 210.4 150.1, 212.8 152.2 C 215.3 154.2, 220.5 148.1, 223.6 148.1 C 226.8 148.1, 231.8 147.2, 231.8 152.2 C 231.8 157.1, 221.6 169.1, 223.6 177.8 C 225.7 186.6, 234.9 198.6, 243.9 204.9 C 252.9 211.2, 271.2 215.7, 277.7 215.7 C 284.2 215.7, 278.6 207.8, 283.1 204.9 C 287.6 201.9, 296.8 196.1, 304.7 198.1 C 312.6 200.1, 328.4 211.8, 330.4 217.0 C 332.4 222.2, 316.9 226.7, 316.9 229.2 C 316.9 231.7, 327.3 230.5, 330.4 231.9 C 333.6 233.2, 335.4 235.5, 335.8 237.3 C 336.3 239.1, 331.3 241.4, 333.1 242.7 C 334.9 244.1, 343.7 243.4, 346.6 245.4 C 349.5 247.4, 353.2 249.0, 350.7 254.9 C 348.2 260.7, 338.3 277.2, 331.8 280.5 C 325.2 283.9, 317.3 275.6, 311.5 275.1 C 305.6 274.7, 298.6 275.4, 296.6 277.8 C 294.6 280.3, 300.7 285.9, 299.3 290.0 C 298.0 294.1, 283.3 295.9, 288.5 302.2 C 293.7 308.5, 317.8 321.3, 330.4 327.8 C 343.0 334.4, 359.2 337.7, 364.2 341.4 C 369.1 345.0, 360.1 346.3, 360.1 349.5 C 360.1 352.6, 361.7 356.7, 364.2 360.3 C 366.7 363.9, 371.8 369.5, 375.0 371.1 C 378.2 372.7, 379.1 364.8, 383.1 369.7 C 387.2 374.7, 388.7 388.2, 399.3 400.8 C 409.9 413.4, 438.7 435.3, 446.6 445.4 C 454.5 455.5, 445.7 457.1, 446.6 461.6 C 447.5 466.1, 450.0 469.7, 452.0 472.4 C 454.1 475.1, 456.8 478.1, 458.8 477.8 C 460.8 477.6, 461.9 470.0, 464.2 471.1 C 466.4 472.2, 466.4 479.9, 472.3 484.6 C 478.2 489.3, 495.0 495.9, 499.3 499.5 C 503.6 503.1, 500.2 504.0, 498.0 506.2 C 495.7 508.5, 487.8 510.9, 485.8 513.0 C 483.8 515.0, 481.3 512.5, 485.8 518.4 C 490.3 524.2, 509.0 541.6, 512.8 548.1 C 516.7 554.6, 510.8 555.3, 508.8 557.6 C 506.8 559.8, 501.1 559.8, 500.7 561.6 C 500.2 563.4, 505.4 564.5, 506.1 568.4 C 506.8 572.2, 506.8 577.4, 504.7 584.6 C 502.7 591.8, 493.2 600.8, 493.9 611.6 C 494.6 622.4, 506.3 640.9, 508.8 649.5 C 511.3 658.0, 509.9 658.2, 508.8 663.0 C 507.7 667.7, 502.5 672.0, 502.0 677.8 C 501.6 683.7, 505.9 691.1, 506.1 698.1 C 506.3 705.1, 504.7 715.2, 503.4 719.7 C 502.0 724.2, 500.5 724.9, 498.0 725.1 C 495.5 725.4, 495.3 718.4, 488.5 721.1 C 481.8 723.8, 465.3 738.0, 457.4 741.4 C 449.5 744.7, 444.4 738.6, 441.2 741.4 C 438.1 744.1, 442.6 755.5, 438.5 757.6 C 434.5 759.6, 422.5 752.8, 416.9 753.5 C 411.3 754.2, 406.1 756.7, 404.7 761.6 C 403.4 766.6, 405.2 777.4, 408.8 783.2 C 412.4 789.1, 423.9 792.5, 426.4 796.8 C 428.8 801.0, 425.7 807.6, 423.6 808.9 C 421.6 810.3, 416.4 805.1, 414.2 804.9 C 411.9 804.6, 412.2 808.9, 410.1 807.6 C 408.1 806.2, 407.4 797.2, 402.0 796.8 C 396.6 796.3, 384.2 804.2, 377.7 804.9 C 371.2 805.5, 365.3 799.5, 362.8 800.8 C 360.4 802.2, 364.9 808.9, 362.8 813.0 C 360.8 817.0, 355.2 823.1, 350.7 825.1 C 346.2 827.2, 340.1 824.0, 335.8 825.1 C 331.5 826.3, 325.2 827.8, 325.0 831.9 C 324.8 835.9, 331.1 847.2, 334.5 849.5 C 337.8 851.7, 340.5 844.1, 345.3 845.4 C 350.0 846.8, 362.2 853.5, 362.8 857.6 C 363.5 861.6, 352.3 860.7, 349.3 869.7 C 346.4 878.7, 345.5 901.7, 345.3 911.6 C 345.0 921.5, 348.6 925.1, 348.0 929.2 C 347.3 933.2, 341.7 934.1, 341.2 935.9 C 340.8 937.7, 341.7 939.8, 345.3 940.0 C 348.9 940.2, 355.4 942.7, 362.8 937.3 C 370.3 931.9, 379.5 914.5, 389.9 907.6 C 400.2 900.6, 417.8 899.7, 425.0 895.4 C 432.2 891.1, 430.0 883.7, 433.1 881.9 C 436.3 880.1, 441.2 885.0, 443.9 884.6 C 446.6 884.1, 448.4 881.7, 449.3 879.2 C 450.2 876.7, 448.2 872.2, 449.3 869.7 C 450.5 867.3, 455.2 866.1, 456.1 864.3 C 457.0 862.5, 453.6 861.2, 454.7 858.9 C 455.9 856.7, 461.3 855.1, 462.8 850.8 C 464.4 846.5, 463.3 835.7, 464.2 833.2 C 465.1 830.8, 466.2 836.4, 468.2 835.9 C 470.3 835.5, 474.3 830.3, 476.4 830.5 C 478.4 830.8, 475.9 837.5, 480.4 837.3 C 484.9 837.1, 495.9 832.8, 503.4 829.2 C 510.8 825.6, 520.3 817.7, 525.0 815.7 C 529.7 813.6, 530.0 818.8, 531.8 817.0 C 533.6 815.2, 532.4 807.6, 535.8 804.9 C 539.2 802.2, 544.6 804.9, 552.0 800.8 C 559.5 796.8, 574.3 783.9, 580.4 780.5 C 586.5 777.2, 586.5 782.8, 588.5 780.5 C 590.5 778.3, 590.1 771.1, 592.6 767.0 C 595.0 763.0, 602.0 759.1, 603.4 756.2 C 604.7 753.3, 600.2 751.0, 600.7 749.5 C 601.1 747.9, 605.9 749.2, 606.1 746.8 C 606.3 744.3, 601.6 737.7, 602.0 734.6 C 602.5 731.4, 608.8 729.4, 608.8 727.8 C 608.8 726.3, 602.0 727.2, 602.0 725.1 C 602.0 723.1, 608.8 719.3, 608.8 715.7 C 608.8 712.1, 602.0 706.4, 602.0 703.5 C 602.0 700.6, 607.7 697.9, 608.8 698.1 C 609.9 698.3, 607.9 703.1, 608.8 704.9 C 609.7 706.7, 613.7 710.9, 614.2 708.9 C 614.6 706.9, 611.0 695.9, 611.5 692.7 C 611.9 689.5, 617.6 693.4, 616.9 690.0 C 616.2 686.6, 609.0 679.0, 607.4 672.4 C 605.9 665.9, 608.1 655.5, 607.4 650.8 C 606.8 646.1, 603.4 647.2, 603.4 644.1 C 603.4 640.9, 610.6 646.8, 607.4 631.9 C 604.3 617.0, 587.8 568.6, 584.5 554.9 C 581.1 541.1, 591.0 554.6, 587.2 549.5 C 583.3 544.3, 566.7 530.3, 561.5 523.8 C 556.3 517.3, 558.3 513.6, 556.1 510.3 C 553.8 506.9, 548.9 506.0, 548.0 503.5 C 547.1 501.0, 551.6 496.5, 550.7 495.4 C 549.8 494.3, 544.1 497.9, 542.6 496.8 C 541.0 495.6, 548.4 494.7, 541.2 488.6 C 534.0 482.6, 514.2 472.9, 499.3 460.3 C 484.5 447.7, 461.5 423.6, 452.0 413.0 C 442.6 402.4, 444.6 403.3, 442.6 396.8 C 440.5 390.2, 444.6 380.1, 439.9 373.8 C 435.1 367.5, 422.3 367.9, 414.2 358.9 C 406.1 349.9, 393.0 329.4, 391.2 319.7 C 389.4 310.0, 401.4 306.7, 403.4 300.8 C 405.4 295.0, 402.0 290.7, 403.4 284.6 C 404.7 278.5, 408.6 267.9, 411.5 264.3 C 414.4 260.7, 416.9 265.9, 420.9 263.0 C 425.0 260.0, 431.1 249.9, 435.8 246.8 C 440.5 243.6, 447.1 247.9, 449.3 244.1 C 451.6 240.2, 447.1 229.9, 449.3 223.8 C 451.6 217.7, 458.1 209.6, 462.8 207.6 C 467.6 205.5, 475.0 211.6, 477.7 211.6 C 480.4 211.6, 480.6 209.4, 479.1 207.6 C 477.5 205.8, 467.1 202.2, 468.2 200.8 C 469.4 199.5, 480.0 201.7, 485.8 199.5 C 491.7 197.2, 500.5 186.6, 503.4 187.3 C 506.3 188.0, 502.3 203.1, 503.4 203.5 C 504.5 204.0, 509.9 194.1, 510.1 190.0 C 510.4 185.9, 503.6 182.6, 504.7 179.2 C 505.9 175.8, 514.9 170.4, 516.9 169.7 C 518.9 169.1, 514.6 174.9, 516.9 175.1 C 519.1 175.4, 528.4 172.4, 530.4 171.1 C 532.4 169.7, 527.9 168.8, 529.1 167.0 C 530.2 165.2, 538.1 162.7, 537.2 160.3 C 536.3 157.8, 530.4 153.1, 523.6 152.2 C 516.9 151.3, 501.8 155.5, 496.6 154.9 C 491.4 154.2, 495.5 149.9, 492.6 148.1 C 489.6 146.3, 481.8 146.3, 479.1 144.1 C 476.4 141.8, 480.0 136.8, 476.4 134.6 C 472.7 132.3, 462.2 136.2, 457.4 130.5 C 452.7 124.9, 448.0 107.1, 448.0 100.8 C 448.0 94.5, 455.0 96.5, 457.4 92.7 C 459.9 88.9, 464.6 81.7, 462.8 77.8 C 461.0 74.0, 451.4 70.2, 446.6 69.7 C 441.9 69.3, 438.3 75.6, 434.5 75.1 C 430.6 74.7, 428.4 67.7, 423.6 67.0 C 418.9 66.4, 411.7 72.0, 406.1 71.1 C 400.5 70.2, 396.6 65.5, 389.9 61.6 Z"
                fill={isDark ? 'url(#vnMainlandGradDark)' : 'url(#vnMainlandGradLight)'}
                stroke={isDark ? '#38BDF8' : '#0284C7'}
                strokeWidth="2.5"
                strokeLinejoin="round"
                className="transition-colors hover:brightness-105 cursor-pointer"
              />
            </g>

            {/* ========================================================= */}
            {/* QUẦN ĐẢO HOÀNG SA (VIỆT NAM) - PARACEL ARCHIPELAGO       */}
            {/* ========================================================= */}
            <g id="hoang-sa-archipelago" className="cursor-pointer group" transform="translate(160, 0)">
              {/* Island Cluster matching user image */}
              <circle cx="560" cy="420" r="5" fill={isDark ? '#38BDF8' : '#0284C7'} className="animate-pulse" />
              <circle cx="576" cy="428" r="4" fill={isDark ? '#38BDF8' : '#0284C7'} />
              <circle cx="552" cy="440" r="4.5" fill={isDark ? '#38BDF8' : '#0284C7'} />
              <circle cx="590" cy="448" r="3.5" fill={isDark ? '#38BDF8' : '#0284C7'} />
              <circle cx="572" cy="460" r="4" fill={isDark ? '#38BDF8' : '#0284C7'} />
              <circle cx="545" cy="458" r="3.5" fill={isDark ? '#38BDF8' : '#0284C7'} />
              <circle cx="585" cy="472" r="4" fill={isDark ? '#38BDF8' : '#0284C7'} />
              <circle cx="600" cy="440" r="3" fill={isDark ? '#38BDF8' : '#0284C7'} />
              <circle cx="565" cy="482" r="3" fill={isDark ? '#38BDF8' : '#0284C7'} />
              <circle cx="605" cy="465" r="3.5" fill={isDark ? '#38BDF8' : '#0284C7'} />
              <circle cx="550" cy="488" r="3" fill={isDark ? '#38BDF8' : '#0284C7'} />

              {/* Archipelago Boundary */}
              <ellipse cx="575" cy="455" rx="48" ry="42" stroke={isDark ? '#38BDF8' : '#0284C7'} strokeWidth="1.2" strokeDasharray="4 4" fill={isDark ? 'rgba(56,189,248,0.08)' : 'rgba(2,132,199,0.08)'} opacity="0.8" />

              {/* Sovereignty Title Box */}
              <g transform="translate(505, 375)">
                <rect x="0" y="0" width="165" height="26" rx="8" fill={isDark ? '#020617' : '#FFFFFF'} stroke={isDark ? '#38BDF8' : '#0284C7'} strokeWidth="1.5" opacity="0.95" />
                <text x="82.5" y="17" fill={isDark ? '#F8FAFC' : '#0F172A'} fontSize="11" fontWeight="800" textAnchor="middle" letterSpacing="0.5">
                  ★ QĐ. HOÀNG SA (VN)
                </text>
              </g>
            </g>

            {/* ========================================================= */}
            {/* QUẦN ĐẢO TRƯỜNG SA (VIỆT NAM) - SPRATLY ARCHIPELAGO      */}
            {/* ========================================================= */}
            <g id="truong-sa-archipelago" className="cursor-pointer group" transform="translate(140, 0)">
              {/* Island Cluster matching user image */}
              <circle cx="610" cy="730" r="5" fill={isDark ? '#38BDF8' : '#0284C7'} className="animate-pulse" />
              <circle cx="628" cy="748" r="4" fill={isDark ? '#38BDF8' : '#0284C7'} />
              <circle cx="595" cy="762" r="4.5" fill={isDark ? '#38BDF8' : '#0284C7'} />
              <circle cx="645" cy="770" r="4" fill={isDark ? '#38BDF8' : '#0284C7'} />
              <circle cx="618" cy="795" r="5" fill={isDark ? '#38BDF8' : '#0284C7'} />
              <circle cx="585" cy="815" r="3.5" fill={isDark ? '#38BDF8' : '#0284C7'} />
              <circle cx="635" cy="828" r="4" fill={isDark ? '#38BDF8' : '#0284C7'} />
              <circle cx="605" cy="850" r="4.5" fill={isDark ? '#38BDF8' : '#0284C7'} />
              <circle cx="660" cy="805" r="3.5" fill={isDark ? '#38BDF8' : '#0284C7'} />
              <circle cx="650" cy="845" r="4" fill={isDark ? '#38BDF8' : '#0284C7'} />
              <circle cx="620" cy="875" r="4" fill={isDark ? '#38BDF8' : '#0284C7'} />
              <circle cx="575" cy="840" r="3.5" fill={isDark ? '#38BDF8' : '#0284C7'} />
              <circle cx="590" cy="895" r="4" fill={isDark ? '#38BDF8' : '#0284C7'} />
              <circle cx="640" cy="890" r="3.5" fill={isDark ? '#38BDF8' : '#0284C7'} />
              <circle cx="610" cy="920" r="4" fill={isDark ? '#38BDF8' : '#0284C7'} />
              <circle cx="550" cy="915" r="3" fill={isDark ? '#38BDF8' : '#0284C7'} />
              <circle cx="570" cy="940" r="3.5" fill={isDark ? '#38BDF8' : '#0284C7'} />
              <circle cx="630" cy="945" r="3.5" fill={isDark ? '#38BDF8' : '#0284C7'} />
              <circle cx="600" cy="960" r="3" fill={isDark ? '#38BDF8' : '#0284C7'} />

              {/* Archipelago Boundary */}
              <ellipse cx="615" cy="845" rx="65" ry="85" stroke={isDark ? '#38BDF8' : '#0284C7'} strokeWidth="1.2" strokeDasharray="4 4" fill={isDark ? 'rgba(56,189,248,0.08)' : 'rgba(2,132,199,0.08)'} opacity="0.8" />

              {/* Sovereignty Title Box */}
              <g transform="translate(530, 680)">
                <rect x="0" y="0" width="168" height="26" rx="8" fill={isDark ? '#020617' : '#FFFFFF'} stroke={isDark ? '#38BDF8' : '#0284C7'} strokeWidth="1.5" opacity="0.95" />
                <text x="84" y="17" fill={isDark ? '#F8FAFC' : '#0F172A'} fontSize="11" fontWeight="800" textAnchor="middle" letterSpacing="0.5">
                  ★ QĐ. TRƯỜNG SA (VN)
                </text>
              </g>
            </g>

            {/* ========================================================= */}
            {/* OTHER KEY ISLANDS (PHÚ QUỐC, CÔN ĐẢO, LÝ SƠN, PHÚ QUÝ)  */}
            {/* ========================================================= */}
            {/* Đảo Phú Quốc */}
            <g id="dao-phu-quoc" className="cursor-pointer">
              <ellipse cx="290.5" cy="819.9" rx="10" ry="18" fill={isDark ? 'url(#vnMainlandGradDark)' : 'url(#vnMainlandGradLight)'} stroke={isDark ? '#38BDF8' : '#0284C7'} strokeWidth="2" transform="rotate(-15 290.5 819.9)" />
              <text x="255" y="795" fill={isDark ? '#E2E8F0' : '#334155'} fontSize="11" fontWeight="700">Đ. Phú Quốc</text>
            </g>

            {/* Côn Đảo */}
            <g id="con-dao" className="cursor-pointer">
              <ellipse cx="444.0" cy="911.0" rx="7" ry="10" fill={isDark ? 'url(#vnMainlandGradDark)' : 'url(#vnMainlandGradLight)'} stroke={isDark ? '#38BDF8' : '#0284C7'} strokeWidth="1.8" transform="rotate(30 444.0 911.0)" />
              <text x="459.0" y="916.0" fill={isDark ? '#E2E8F0' : '#334155'} fontSize="10" fontWeight="700">Côn Đảo</text>
            </g>

            {/* Đảo Phú Quý */}
            <g id="dao-phu-quy" className="cursor-pointer">
              <circle cx="578.1" cy="803.2" r="4.5" fill={isDark ? '#38BDF8' : '#0284C7'} />
              <text x="590.1" y="806.2" fill={isDark ? '#CBD5E1' : '#475569'} fontSize="9" fontWeight="600">Phú Quý</text>
            </g>

            {/* Đảo Lý Sơn */}
            <g id="dao-ly-son" className="cursor-pointer">
              <circle cx="587.4" cy="514.9" r="4.5" fill={isDark ? '#38BDF8' : '#0284C7'} />
              <text x="600.4" y="517.9" fill={isDark ? '#CBD5E1' : '#475569'} fontSize="9" fontWeight="600">Lý Sơn</text>
            </g>

            {/* Đảo Cồn Cỏ */}
            <g id="dao-con-co" className="cursor-pointer">
              <circle cx="486.2" cy="408.9" r="3.5" fill={isDark ? '#38BDF8' : '#0284C7'} />
              <text x="496.2" y="411.9" fill={isDark ? '#CBD5E1' : '#475569'} fontSize="8" fontWeight="600">Cồn Cỏ</text>
            </g>

            {/* Bạch Long Vĩ */}
            <g id="bach-long-vi" className="cursor-pointer">
              <circle cx="508.2" cy="233.6" r="4" fill={isDark ? '#38BDF8' : '#0284C7'} />
              <text x="518.2" y="236.6" fill={isDark ? '#CBD5E1' : '#475569'} fontSize="9" fontWeight="600">Bạch Long Vĩ</text>
            </g>

            {/* Sea Geography Watermark Labels */}
            <text x="510" y="590" fill={isDark ? '#38BDF8' : '#0284C7'} opacity={isDark ? 0.16 : 0.14} fontSize="32" fontWeight="900" letterSpacing="6">
              BIỂN ĐÔNG
            </text>
            <text x="390" y="270" fill={isDark ? '#38BDF8' : '#0284C7'} opacity={isDark ? 0.14 : 0.12} fontSize="16" fontWeight="800" letterSpacing="2">
              VỊNH BẮC BỘ
            </text>
            <text x="180" y="820" fill={isDark ? '#38BDF8' : '#0284C7'} opacity={isDark ? 0.14 : 0.12} fontSize="16" fontWeight="800" letterSpacing="2">
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
                <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 whitespace-nowrap px-1.5 py-0.5 rounded-md bg-white/95 dark:bg-slate-950/90 text-[9px] font-bold text-slate-800 dark:text-slate-200 shadow-md border border-slate-200 dark:border-slate-700/50 pointer-events-none">
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
          className="absolute bottom-4 left-4 right-4 md:right-auto md:w-80 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xl text-slate-900 dark:text-white cursor-pointer hover:border-orange-500 transition-colors"
          title="Nhấn để xem chi tiết thông số trạm / Click to view station details"
        >
          {(() => {
            const st = hoveredStation || selectedStation!;
            const category = getAQICategory(st.aqi);
            return (
              <div>
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <div>
                    <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      {st.province} • {st.id}
                    </span>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white line-clamp-1">{st.name}</h4>
                  </div>
                  <AQIBadge aqi={st.aqi} size="sm" />
                </div>

                <div className="grid grid-cols-3 gap-2 mt-2 pt-2 border-t border-slate-200 dark:border-slate-800 text-xs">
                  <div className="bg-slate-100 dark:bg-slate-800/60 p-1.5 rounded-xl text-center">
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 block">PM2.5</span>
                    <span className="font-bold text-orange-500 dark:text-orange-400">{st.pollutants.pm25.value}</span>
                    <span className="text-[9px] text-slate-400 dark:text-slate-500 block">µg/m³</span>
                  </div>
                  <div className="bg-slate-100 dark:bg-slate-800/60 p-1.5 rounded-xl text-center">
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 block">{t('hero.temp')}</span>
                    <span className="font-bold text-sky-500 dark:text-sky-400">{st.temperature}°C</span>
                    <span className="text-[9px] text-slate-400 dark:text-slate-500 block">{st.humidity}%</span>
                  </div>
                  <div className="bg-slate-100 dark:bg-slate-800/60 p-1.5 rounded-xl text-center">
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 block">{t('hero.wind')}</span>
                    <span className="font-bold text-emerald-500 dark:text-emerald-400">{st.windSpeed}</span>
                    <span className="text-[9px] text-slate-400 dark:text-slate-500 block">km/h</span>
                  </div>
                </div>

                <div className="mt-2.5 flex items-center justify-between text-[11px] text-slate-600 dark:text-slate-300">
                  <span className="truncate">{lang === 'vi' ? category.descriptionVi : category.descriptionEn}</span>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* Bottom Color Scale Bar */}
      <div className="p-3 bg-slate-50/95 dark:bg-slate-950/90 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs">
        <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
          {t('map.legend_title')}
        </span>
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="inline-flex items-center gap-1 text-[11px] text-slate-600 dark:text-slate-300">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> 0-50 {lang === 'vi' ? 'Tốt' : 'Good'}
          </span>
          <span className="inline-flex items-center gap-1 text-[11px] text-slate-600 dark:text-slate-300">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span> 51-100 {lang === 'vi' ? 'TB' : 'Mod'}
          </span>
          <span className="inline-flex items-center gap-1 text-[11px] text-slate-600 dark:text-slate-300">
            <span className="w-2.5 h-2.5 rounded-full bg-orange-500"></span> 101-150 {lang === 'vi' ? 'Kém' : 'Sens'}
          </span>
          <span className="inline-flex items-center gap-1 text-[11px] text-slate-600 dark:text-slate-300">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500"></span> 151-200 {lang === 'vi' ? 'Xấu' : 'Unhealthy'}
          </span>
          <span className="inline-flex items-center gap-1 text-[11px] text-slate-600 dark:text-slate-300">
            <span className="w-2.5 h-2.5 rounded-full bg-purple-500"></span> 201-300 {lang === 'vi' ? 'Rất xấu' : 'Very Unhealthy'}
          </span>
          <span className="inline-flex items-center gap-1 text-[11px] text-slate-600 dark:text-slate-300">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-950"></span> &gt;300 {lang === 'vi' ? 'Nguy hại' : 'Haz'}
          </span>
        </div>
      </div>
    </div>
  );
};