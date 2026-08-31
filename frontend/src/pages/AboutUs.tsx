import React, { useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { FadeIn } from '../components/FadeIn';
import {
  Wind,
  ShieldCheck,
  Database,
  Users,
  Send,
  CheckCircle2,
  Mail,
  Phone,
  MapPin,
  Sparkles,
  Globe,
  Award
} from 'lucide-react';

export const AboutUs: React.FC = () => {
  const { lang, t } = useLanguage();
  const [formData, setFormData] = useState({ name: '', email: '', message: '', topic: 'Data Inquiry' });
  const [isSent, setIsSent] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSent(true);
    setTimeout(() => {
      setFormData({ name: '', email: '', message: '', topic: 'Data Inquiry' });
      setIsSent(false);
    }, 4000);
  };

  const dataSources = [
    {
      name: 'Tổng cục Môi trường',
      desc: 'Mạng lưới trạm quan trắc không khí tự động chuẩn quốc gia tại các đô thị trọng điểm.',
      badge: 'Chính thống',
    },
    {
      name: 'Copernicus Atmosphere Service (CAMS)',
      desc: 'Mô hình vệ tinh khí quyển phân giải cao của Liên minh Châu Âu cung cấp dự báo ô nhiễm và hạt mịn.',
      badge: 'Vệ tinh EU',
    },
    {
      name: 'Mạng lưới cảm biến PAM Air',
      desc: 'Hơn 400 điểm quan trắc IoT chất lượng không khí cộng đồng trên 63 tỉnh thành Việt Nam.',
      badge: 'Cộng đồng IoT',
    },
    {
      name: 'Open-Meteo & ECMWF',
      desc: 'Dữ liệu thời tiết toàn cầu, nhiệt độ, độ ẩm, trường gió và bức xạ tia cực tím (UV).',
      badge: 'Thời tiết 24/7',
    },
  ];

  const team = [
    {
      name: 'TS. Nguyễn Tiến Đức Huy',
      role: 'Chuyên gia Khí quyển & Dữ liệu Môi trường',
      affiliation: 'Trưởng nhóm Nghiên cứu & Dự báo',
    },
    {
      name: 'ThS. Tiêu Trung Kiên',
      role: 'Kỹ sư Trưởng Hệ thống IoT & Trạm Quan trắc',
      affiliation: 'Phát triển Cảm biến & Thu thập Dữ liệu',
    },
    {
      name: 'ThS. Lê Minh Quân',
      role: 'Kỹ sư Kiến trúc Phần mềm & AI Môi trường',
      affiliation: 'Hệ thống Phân tích & Giao diện Người dùng',
    },
  ];

  return (
    <div className="w-full space-y-16 pb-20">
      <FadeIn direction="up">
        {/* Mission Statement Hero */}
        <div className="text-center max-w-3xl mx-auto space-y-4 pt-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-500/10 text-orange-500 text-xs font-bold border border-orange-500/20">
            <Wind className="w-3.5 h-3.5" />
            <span>{lang === 'vi' ? 'Sứ mệnh vì sức khỏe cộng đồng' : 'Mission for Public Health'}</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
            {lang === 'vi' ? 'Minh bạch hóa chất lượng Không khí Việt Nam' : 'Transparent Air Quality Intelligence in Vietnam'}
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            {lang === 'vi'
              ? 'AirVision VN được thành lập với mục tiêu cung cấp dữ liệu quan trắc không khí tức thời, chuẩn xác và dễ hiểu nhất cho 100 triệu người dân Việt Nam, giúp mỗi gia đình chủ động bảo vệ lá phổi và sức khỏe hàng ngày.'
              : 'AirVision VN delivers transparent, real-time, and actionable air quality data to empower communities across Vietnam.'}
          </p>
        </div>

        {/* Data Sources Grid */}
        <div className="mt-12 space-y-6">
          <div className="text-center max-w-xl mx-auto">
            <h2 className="text-xl font-black text-slate-900 dark:text-white">
              {lang === 'vi' ? 'Nguồn dữ liệu & Phương pháp Chuẩn hóa' : 'Data Sources & Methodology'}
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {dataSources.map((src, idx) => (
              <div
                key={idx}
                className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-2.5"
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">{src.name}</h3>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-100 dark:bg-sky-950 text-sky-600 dark:text-sky-400">
                    {src.badge}
                  </span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  {src.desc}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Team Members */}
        <div className="mt-12 space-y-6">
          <div className="text-center max-w-xl mx-auto">
            <h2 className="text-xl font-black text-slate-900 dark:text-white">
              {lang === 'vi' ? 'Đội ngũ Khoa học & Phát triển' : 'Core Research & Engineering Team'}
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Các chuyên gia khoa học môi trường và kỹ sư công nghệ tận tâm
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            {team.map((member, idx) => (
              <div
                key={idx}
                className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm text-center space-y-2"
              >
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-orange-400 to-sky-500 text-white font-black text-lg flex items-center justify-center mx-auto shadow-md">
                  {member.name.split(' ').pop()?.charAt(0)}
                </div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white pt-1">{member.name}</h3>
                <p className="text-xs text-orange-500 font-semibold">{member.role}</p>
                <p className="text-[11px] text-slate-400">{member.affiliation}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Contact and Feedback Form */}
        <div className="mt-14 p-6 sm:p-10 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl max-w-3xl mx-auto">
          <div className="text-center space-y-1 mb-6">
            <h3 className="text-xl font-black text-slate-900 dark:text-white">
              {lang === 'vi' ? 'Liên hệ & Góp ý Dữ liệu' : 'Contact & Feedback'}
            </h3>
            <p className="text-xs text-slate-500">
              Bạn có dữ liệu trạm quan trắc muốn tích hợp hoặc cần hợp tác nghiên cứu? Hãy gửi thông tin cho chúng tôi.
            </p>
          </div>

          {isSent ? (
            <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs flex items-center justify-center gap-2 font-bold">
              <CheckCircle2 className="w-5 h-5 shrink-0" />
              <span>{lang === 'vi' ? 'Cảm ơn bạn! Thông tin đã được gửi thành công đến ban quản trị.' : 'Thank you! Your inquiry was received.'}</span>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1">
                    {lang === 'vi' ? 'Họ và tên' : 'Full Name'}
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Nguyen Van A"
                    className="w-full bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="email@example.com"
                    className="w-full bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-orange-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1">
                  {lang === 'vi' ? 'Nội dung tin nhắn' : 'Message'}
                </label>
                <textarea
                  required
                  rows={4}
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  placeholder={lang === 'vi' ? 'Nhập nội dung cần hỗ trợ hoặc hợp tác dữ liệu...' : 'Enter your message or inquiry...'}
                  className="w-full bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 rounded-xl p-3.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-orange-500"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 px-4 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs shadow-md transition-all active:scale-98 flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>{lang === 'vi' ? 'Gửi thông tin liên hệ' : 'Send Message'}</span>
                <Send className="w-4 h-4" />
              </button>
            </form>
          )}
        </div>
      </FadeIn>
    </div>
  );
};
