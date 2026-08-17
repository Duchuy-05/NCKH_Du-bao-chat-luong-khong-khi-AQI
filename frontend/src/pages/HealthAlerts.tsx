import React, { useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { ACTIVE_ALERTS, HEALTH_GROUPS_ADVICE } from '../data/mockAirData';
import { AQI_VN_CATEGORIES } from '../utils/aqi.util';
import { formatDateTime } from '../utils/date.util';
import { FadeIn } from '../components/FadeIn';
import {
  ShieldAlert,
  AlertTriangle,
  Flame,
  CheckCircle2,
  HeartPulse,
  Baby,
  Activity,
  Bike,
  Info,
  ExternalLink,
  ShieldCheck
} from 'lucide-react';

export const HealthAlerts: React.FC = () => {
  const { lang, t } = useLanguage();
  const [selectedScaleLevel, setSelectedScaleLevel] = useState<string>('all');

  return (
    <div className="w-full space-y-12 pb-20">
      <FadeIn direction="up">
        {/* Page Header */}
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/10 text-red-500 text-xs font-bold border border-red-500/20 mb-2">
            <ShieldAlert className="w-4 h-4" />
            <span>{lang === 'vi' ? 'Hệ thống Cảnh báo Y tế Khẩn cấp' : 'Emergency Health Alert System'}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            {lang === 'vi' ? 'Cảnh báo Sức khỏe & Quy chuẩn AQI Việt Nam' : 'Health Alerts & Vietnam AQI Standards'}
          </h1>
          <p className="text-xs text-slate-500 mt-1 max-w-2xl leading-relaxed">
            {lang === 'vi'
              ? 'Tổng hợp các cảnh báo ô nhiễm không khí đang có hiệu lực và hướng dẫn y tế phòng ngừa chi tiết theo quy chuẩn QCVN 05:2023/BTNMT'
              : 'Active atmospheric alerts and medical prevention guidelines under QCVN 05:2023 national standard'}
          </p>
        </div>

        {/* 1. Active Alerts Stream */}
        <div className="space-y-4 mt-8">
          <h2 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" />
            <span>{lang === 'vi' ? 'Cảnh báo đang có hiệu lực' : 'Active Alerts'}</span>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {ACTIVE_ALERTS.map((alert) => (
              <div
                key={alert.id}
                className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-red-200 dark:border-red-950/60 shadow-lg relative overflow-hidden space-y-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-red-100 dark:bg-red-950 text-red-600 dark:text-red-400 uppercase tracking-wider">
                      {alert.severity.toUpperCase()} • {alert.id}
                    </span>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white leading-snug">
                      {lang === 'vi' ? alert.titleVi : alert.titleEn}
                    </h3>
                  </div>
                  <div className="p-3 rounded-2xl bg-red-50 dark:bg-red-950/40 text-red-500 shrink-0">
                    <Flame className="w-6 h-6" />
                  </div>
                </div>

                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  {lang === 'vi' ? alert.descriptionVi : alert.descriptionEn}
                </p>

                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 space-y-2">
                  <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block">
                    {lang === 'vi' ? 'Khuyến nghị hành động tức thì:' : 'Recommended Immediate Actions:'}
                  </span>
                  <ul className="space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
                    {(lang === 'vi' ? alert.actionItemsVi : alert.actionItemsEn).map((item, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-orange-500 shrink-0 mt-0.5" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <span>{lang === 'vi' ? alert.locationVi : alert.locationEn}</span>
                  <span>{formatDateTime(alert.timestamp, lang)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 2. Vietnam Standard AQI Matrix (QCVN 05:2023) */}
        <div className="mt-12 space-y-6">
          <div>
            <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
              {lang === 'vi' ? 'Thang Bảng Tiêu chuẩn AQI Việt Nam (QCVN 05:2023)' : 'Vietnam National AQI Standard Matrix'}
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Phân loại tác động sức khỏe và ý nghĩa từng cấp độ chỉ số theo Bộ Tài nguyên & Môi trường
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.values(AQI_VN_CATEGORIES).map((cat) => (
              <div
                key={cat.level}
                className="p-5 rounded-3xl border bg-white dark:bg-slate-900 shadow-sm space-y-3"
                style={{ borderColor: cat.borderColor }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: cat.color }}
                    />
                    <h3 className="text-base font-black text-slate-900 dark:text-white">
                      {lang === 'vi' ? cat.labelVi : cat.labelEn}
                    </h3>
                  </div>
                  <span
                    className="text-xs font-black px-2.5 py-1 rounded-xl"
                    style={{ backgroundColor: cat.bgColor, color: cat.color }}
                  >
                    {cat.min} - {cat.max}
                  </span>
                </div>

                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  {lang === 'vi' ? cat.descriptionVi : cat.descriptionEn}
                </p>

                <div
                  className="p-3 rounded-2xl border text-xs leading-relaxed"
                  style={{
                    backgroundColor: cat.bgColor,
                    borderColor: cat.borderColor,
                    color: cat.textColor,
                  }}
                >
                  <strong className="block mb-1 font-bold">
                    {lang === 'vi' ? 'Hành động bảo vệ:' : 'Protective Action:'}
                  </strong>
                  <span>{lang === 'vi' ? cat.healthAdviceVi : cat.healthAdviceEn}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </FadeIn>
    </div>
  );
};
