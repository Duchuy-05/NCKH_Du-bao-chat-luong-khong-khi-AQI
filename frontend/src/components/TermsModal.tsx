import React from 'react';
import { useLanguage } from '../context/LanguageContext';
import { X, FileText } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface TermsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TermsModal: React.FC<TermsModalProps> = ({ isOpen, onClose }) => {
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
              <div className="w-10 h-10 rounded-xl bg-orange-100 dark:bg-orange-950/50 text-orange-600 dark:text-orange-400 flex items-center justify-center">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-black tracking-tight">{t('footer.terms')}</h3>
                <p className="text-xs text-slate-500">AirVision VN • Cập nhật lần cuối: 2026</p>
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
            <h4 className="font-bold text-slate-900 dark:text-white text-sm">1. Mục đích và Phạm vi Dịch vụ</h4>
            <p>
              {lang === 'vi'
                ? 'AirVision VN hiển thị dự báo VN_AQI theo thành phố bằng mô hình SVR và khuyến cáo sức khỏe. Ứng dụng hiện không cung cấp số đo AQI thời gian thực hoặc dữ liệu trực tiếp từ trạm quan trắc.'
                : 'AirVision VN displays city-level VN_AQI forecasts from SVR models and health advice. It does not currently provide real-time AQI readings or direct monitoring-station data.'}
            </p>

            <h4 className="font-bold text-slate-900 dark:text-white text-sm">2. Nguồn dữ liệu & Độ chính xác</h4>
            <p>
              {lang === 'vi'
                ? 'Backend lấy dữ liệu lịch sử chất lượng không khí và thời tiết từ Open-Meteo tại tọa độ đại diện của năm thành phố, xử lý, tính VN_AQI và dùng dữ liệu đó để huấn luyện/dự báo SVR. Kết quả mang tính tham khảo, không thay thế dữ liệu hoặc hướng dẫn chính thức từ cơ quan chức năng.'
                : 'The backend retrieves historical air-quality and weather data from Open-Meteo at representative coordinates for five cities, processes it, calculates VN_AQI, and uses it for SVR forecasts. Results are informational and do not replace official data or guidance.'}
            </p>

            <h4 className="font-bold text-slate-900 dark:text-white text-sm">3. Quyền sở hữu trí tuệ</h4>
            <p>
              Mọi biểu đồ, thuật toán tính toán VN_AQI theo Quyết định 1459/QĐ-TCMT và giao diện hiển thị thuộc quyền sở hữu của AirVision VN. Người dùng có quyền xem, chia sẻ dữ liệu phi thương mại có dẫn nguồn.
            </p>

            <h4 className="font-bold text-slate-900 dark:text-white text-sm">4. Giới hạn trách nhiệm</h4>
            <p>
              {lang === 'vi'
                ? 'Dự báo có thể sai lệch do giới hạn dữ liệu và mô hình. Khuyến cáo sức khỏe trên ứng dụng chỉ nhằm mục đích thông tin, không phải tư vấn y tế cá nhân.'
                : 'Forecasts can be inaccurate due to data and model limitations. Health advice is informational and is not individual medical advice.'}
            </p>
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50 flex justify-end">
            <button
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs transition-all"
            >
              {lang === 'vi' ? 'Tôi đã hiểu' : 'I Understand'}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
