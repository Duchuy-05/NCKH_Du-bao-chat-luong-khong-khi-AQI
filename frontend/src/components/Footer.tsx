import React from 'react';
import { useNavigate } from 'react-router-dom';
import logoImg from '../assets/epu_logo.png';
import { useLanguage } from '../context/LanguageContext';
import { ArrowRight, FileText, Shield } from 'lucide-react';

interface FooterProps {
  onOpenTerms: () => void;
  onOpenPrivacy: () => void;
}

export const Footer: React.FC<FooterProps> = ({ onOpenTerms, onOpenPrivacy }) => {
  const navigate = useNavigate();
  const { lang, t } = useLanguage();
  const links = [
    { path: '/', label: t('nav.home') },
    { path: '/maps', label: t('nav.maps') },
    { path: '/forecast', label: t('nav.forecast') },
    { path: '/alerts', label: t('nav.alerts') },
    { path: '/about', label: t('nav.about') },
  ];

  return (
    <footer className="w-full border-t border-slate-200 bg-slate-100 pt-12 pb-8 text-slate-600 transition-colors dark:border-slate-800 dark:bg-black dark:text-slate-300">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-10 border-b border-slate-200 pb-10 dark:border-slate-800/60 md:grid-cols-3">
          <div className="space-y-4">
            <button type="button" onClick={() => navigate('/')} className="flex items-center gap-2.5 text-left">
              <img src={logoImg} alt="AirVision VN" className="h-9 w-9 rounded-xl shadow-md" />
              <span className="text-xl font-black tracking-tight text-slate-900 dark:text-white">AirVision <span className="rounded-md bg-orange-500 px-1.5 py-0.5 text-xs text-white">VN</span></span>
            </button>
            <p className="max-w-sm text-xs leading-relaxed text-slate-500 dark:text-slate-400">{t('footer.about')}</p>
          </div>

          <div>
            <h2 className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">{t('footer.quick_links')}</h2>
            <ul className="space-y-2.5">
              {links.map((link) => (
                <li key={link.path}>
                  <button type="button" onClick={() => navigate(link.path)} className="inline-flex items-center gap-1.5 text-xs transition-colors hover:text-orange-500">
                    <ArrowRight className="h-3 w-3 text-slate-400" /> {link.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div className="space-y-4">
            <div>
              <h2 className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                {lang === 'vi' ? 'Nguồn dữ liệu' : 'Data source'}
              </h2>
              <p className="text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                {lang === 'vi'
                  ? 'Open-Meteo/CAMS tại tọa độ đại diện của năm thành phố. AQI hiện tại tính từ nồng độ chất ô nhiễm; khi chưa đủ dữ liệu trọn ngày, AQI hôm nay được hiển thị dưới dạng dự báo SVR. Đây không phải số đo từ trạm.'
                  : 'Open-Meteo/CAMS data at representative coordinates for five cities. Current AQI is calculated from pollutant concentrations; until a full day of data is available, today’s value is shown as an SVR forecast. These are not station measurements.'}
              </p>
              <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] font-semibold text-sky-700 dark:text-sky-400">
                <a href="https://open-meteo.com/en/docs/air-quality-api" target="_blank" rel="noreferrer" className="hover:underline">
                  Open-Meteo Air Quality API
                </a>
                <a href="https://atmosphere.copernicus.eu/" target="_blank" rel="noreferrer" className="hover:underline">
                  CAMS
                </a>
              </div>
            </div>
            <div className="border-t border-slate-200 pt-4 dark:border-slate-800/60">
              <h2 className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                {lang === 'vi' ? 'AQI ngày và AQI giờ' : 'Daily and hourly AQI'}
              </h2>
              <div className="space-y-2 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                <p>
                  <strong className="text-slate-700 dark:text-slate-200">
                    {lang === 'vi' ? 'AQI ngày:' : 'Daily AQI:'}
                  </strong>{' '}
                  {lang === 'vi'
                    ? 'được tính theo VN_AQI từ dữ liệu đủ 24 giờ; vì vậy trong ngày, AQI hôm nay được hiển thị dưới dạng dự báo SVR.'
                    : 'calculated under VN_AQI from a complete 24-hour dataset; during the day, today’s value is shown as an SVR forecast.'}
                </p>
                <p>
                  <strong className="text-slate-700 dark:text-slate-200">
                    {lang === 'vi' ? 'AQI giờ:' : 'Hourly AQI:'}
                  </strong>{' '}
                  {lang === 'vi'
                    ? 'thể hiện biến động theo từng giờ từ nồng độ chất ô nhiễm; PM2.5 và PM10 dùng NowCast từ các giờ gần nhất.'
                    : 'shows hour-by-hour changes from pollutant concentrations; PM2.5 and PM10 use a NowCast based on recent hours.'}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-4 text-xs">
              <button type="button" onClick={onOpenTerms} className="inline-flex items-center gap-1.5 transition-colors hover:text-sky-600">
                <FileText className="h-3.5 w-3.5" /> {t('footer.terms')}
              </button>
              <button type="button" onClick={onOpenPrivacy} className="inline-flex items-center gap-1.5 transition-colors hover:text-sky-600">
                <Shield className="h-3.5 w-3.5" /> {t('footer.privacy')}
              </button>
            </div>
          </div>
        </div>

        <div className="flex flex-col items-center justify-between gap-3 pt-6 text-center text-[11px] text-slate-500 sm:flex-row sm:text-left">
          <p>{t('footer.rights')}</p>
          <span>{lang === 'vi' ? 'Dự báo cần được xem cùng thông tin từ cơ quan chức năng.' : 'Forecasts should be considered alongside official public information.'}</span>
        </div>
      </div>
    </footer>
  );
};
