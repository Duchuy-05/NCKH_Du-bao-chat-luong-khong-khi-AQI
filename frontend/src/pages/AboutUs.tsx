import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Database, ExternalLink, MapPin, ShieldCheck, Wind, Cpu } from 'lucide-react';
import { FadeIn } from '../components/FadeIn';
import { useLanguage } from '../context/LanguageContext';

const cities = [
  { vi: 'Hà Nội', en: 'Hanoi' },
  { vi: 'Hải Phòng', en: 'Hai Phong' },
  { vi: 'Đà Nẵng', en: 'Da Nang' },
  { vi: 'TP. Hồ Chí Minh', en: 'Ho Chi Minh City' },
  { vi: 'Cần Thơ', en: 'Can Tho' },
];

export const AboutUs: React.FC = () => {
  const { lang } = useLanguage();

  const information = [
    {
      icon: Database,
      title: lang === 'vi' ? 'Nguồn dữ liệu' : 'Data source',
      description: lang === 'vi'
        ? 'Backend nhập dữ liệu lịch sử chất lượng không khí và thời tiết từ Open-Meteo tại tọa độ đại diện của từng thành phố.'
        : 'The backend ingests historical air-quality and weather data from Open-Meteo at representative coordinates for each city.',
      link: true,
    },
    {
      icon: Cpu,
      title: lang === 'vi' ? 'Xử lý và dự báo' : 'Processing and forecasts',
      description: lang === 'vi'
        ? 'Dữ liệu được làm sạch, tính VN_AQI theo giờ/ngày và lưu trong PostgreSQL. Mô hình SVR sử dụng dữ liệu đã lưu để tạo dự báo.'
        : 'Data is cleaned, hourly and daily VN_AQI is calculated and stored in PostgreSQL, then used by SVR models to generate forecasts.',
    },
    {
      icon: ShieldCheck,
      title: lang === 'vi' ? 'Khuyến cáo sức khỏe' : 'Health advice',
      description: lang === 'vi'
        ? 'Backend cung cấp khuyến cáo theo nhóm đối tượng cùng các nguồn tham khảo được lưu trong cơ sở dữ liệu.'
        : 'The backend provides advice for different groups with references stored in the database.',
    },
  ];

  return (
    <div className="w-full space-y-12 pb-20">
      <FadeIn direction="up">
        <section className="mx-auto max-w-3xl space-y-4 pt-4 text-center">
          <div className="mx-auto inline-flex items-center gap-2 rounded-full bg-sky-100 px-3 py-1 text-xs font-bold text-sky-700 dark:bg-sky-950/50 dark:text-sky-300">
            <Wind className="h-4 w-4" /> AirVision VN
          </div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white sm:text-4xl">
            {lang === 'vi' ? 'Về chúng tôi' : 'About us'}
          </h1>
          <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
            {lang === 'vi'
              ? 'AirVision VN là dự án dự báo chỉ số chất lượng không khí VN_AQI bằng mô hình SVR, giúp người dùng tham khảo xu hướng chất lượng không khí tại một số thành phố lớn.'
              : 'AirVision VN is a project that forecasts VN_AQI with SVR models, helping users explore air-quality trends in selected major cities.'}
          </p>
        </section>

        <section className="mt-10 space-y-6">
          <div className="mx-auto max-w-xl text-center">
            <h2 className="text-xl font-black text-slate-900 dark:text-white">
              {lang === 'vi' ? 'Dữ liệu và phương pháp' : 'Data and methodology'}
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {information.map(({ icon: Icon, title, description, link }) => (
              <article key={title} className="space-y-3 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:surface-card">
                <Icon className="h-5 w-5 text-sky-600 dark:text-sky-400" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">{title}</h3>
                <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-300">{description}</p>
                {link && (
                  <a href="https://open-meteo.com/" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[11px] font-bold text-sky-700 hover:underline dark:text-sky-300">
                    Open-Meteo <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </article>
            ))}
          </div>
        </section>

        <section className="mt-10 grid gap-5 md:grid-cols-2">
          <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:surface-card">
            <div className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-orange-500" />
              <h2 className="text-base font-black text-slate-900 dark:text-white">
                {lang === 'vi' ? 'Các thành phố dự báo' : 'Forecast cities'}
              </h2>
            </div>
            <p className="mt-3 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
              {lang === 'vi'
                ? 'Mỗi thành phố được đại diện bằng một tọa độ truy vấn dữ liệu Open-Meteo; hệ thống không sử dụng mạng lưới trạm quan trắc.'
                : 'Each city is represented by one coordinate used to query Open-Meteo; the system does not use a monitoring-station network.'}
            </p>
            <ul className="mt-4 flex flex-wrap gap-2">
              {cities.map((city) => (
                <li key={city.en} className="rounded-full bg-slate-100 px-3 py-1.5 text-[11px] font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                  {lang === 'vi' ? city.vi : city.en}
                </li>
              ))}
            </ul>
          </article>

          <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:surface-card">
            <div className="flex items-center gap-2">
              <Wind className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              <h2 className="text-base font-black text-slate-900 dark:text-white">
                {lang === 'vi' ? 'Khám phá AirVision VN' : 'Explore AirVision VN'}
              </h2>
            </div>
            <p className="mt-3 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
              {lang === 'vi'
                ? 'Xem dự báo AQI theo ngày hoặc theo giờ, hoặc đọc khuyến cáo sức khỏe và nguồn tham khảo.'
                : 'View daily or hourly AQI forecasts, or read health advice and its references.'}
            </p>
            <div className="mt-4 flex flex-wrap gap-4 text-xs font-bold">
              <Link to="/forecast" className="inline-flex items-center gap-1 text-orange-600 hover:underline dark:text-orange-400">
                {lang === 'vi' ? 'Dự báo AQI' : 'AQI forecast'} <ArrowRight className="h-3.5 w-3.5" />
              </Link>
              <Link to="/alerts" className="inline-flex items-center gap-1 text-sky-700 hover:underline dark:text-sky-300">
                {lang === 'vi' ? 'Khuyến cáo sức khỏe' : 'Health advice'} <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </article>
        </section>
      </FadeIn>
    </div>
  );
};
