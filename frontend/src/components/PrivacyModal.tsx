import React from 'react';
import { useLanguage } from '../context/LanguageContext';
import { X, Shield } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface PrivacyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PrivacyModal: React.FC<PrivacyModalProps> = ({ isOpen, onClose }) => {
  const { lang, t } = useLanguage();

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="relative w-full max-w-2xl max-h-[85vh] bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col text-slate-900 dark:text-white"
        >
          {/* Header */}
          <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-sky-100 dark:bg-sky-950/50 text-sky-600 dark:text-sky-400 flex items-center justify-center">
                <Shield className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-black tracking-tight">{t('footer.privacy')}</h3>
                <p className="text-xs text-slate-500">AirVision VN</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div className="p-6 overflow-y-auto space-y-4 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
            <h4 className="font-bold text-slate-900 dark:text-white text-sm">1. Dữ liệu gửi tới backend</h4>
            <p>
              {lang === 'vi'
                ? 'Frontend gửi các yêu cầu đọc dự báo theo mã thành phố và tải khuyến cáo sức khỏe. Trang web hiện không yêu cầu vị trí GPS, không có tài khoản người dùng và không gửi vị trí cá nhân.'
                : 'The frontend requests forecasts by city code and loads health advice. The website does not request GPS location, provide user accounts, or send personal location data.'}
            </p>

            <h4 className="font-bold text-slate-900 dark:text-white text-sm">2. Bộ nhớ trên trình duyệt</h4>
            <p>
              {lang === 'vi'
                ? 'Ứng dụng lưu tùy chọn giao diện sáng/tối và ngôn ngữ VI/EN trong LocalStorage. Bạn có thể xóa các giá trị này trong cài đặt trình duyệt.'
                : 'The app stores the light/dark theme and VI/EN language preference in browser LocalStorage. You can remove them in your browser settings.'}
            </p>

            <h4 className="font-bold text-slate-900 dark:text-white text-sm">3. Tài khoản và thông báo</h4>
            <p>
              {lang === 'vi'
                ? 'Backend hiện chưa hỗ trợ tài khoản người dùng, lưu tùy chọn AQI, bản tin email hoặc cảnh báo AQI tự động.'
                : 'The backend does not currently support user accounts, AQI preference storage, email newsletters, or automated AQI alerts.'}
            </p>

            <h4 className="font-bold text-slate-900 dark:text-white text-sm">4. Dữ liệu nguồn</h4>
            <p>
              {lang === 'vi'
                ? 'Backend truy cập Open-Meteo để nhập dữ liệu khí tượng và chất lượng không khí. Việc lưu trữ và xử lý dữ liệu đó được thực hiện tại backend và PostgreSQL của dự án.'
                : 'The backend accesses Open-Meteo to ingest weather and air-quality data. The project backend and PostgreSQL database store and process that data.'}
            </p>
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50 flex justify-end">
            <button
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-600 text-white font-bold text-xs transition-all"
            >
              {lang === 'vi' ? 'Đồng ý & Đóng' : 'Accept & Close'}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
