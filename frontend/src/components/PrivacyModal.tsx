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
                <p className="text-xs text-slate-500">AirVision VN • Cam kết bảo mật quyền riêng tư</p>
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
            <h4 className="font-bold text-slate-900 dark:text-white text-sm">1. Thu thập dữ liệu vị trí (Geolocation)</h4>
            <p>
              Khi bạn nhấn nút "Vị trí của bạn", trình duyệt sẽ yêu cầu quyền truy cập GPS/tọa độ. Dữ liệu này CHỈ được xử lý trực tiếp trên thiết bị (client-side) để xác định trạm quan trắc gần nhất và gửi thông báo đẩy cảnh báo. Chúng tôi KHÔNG lưu trữ lịch sử di chuyển hay chia sẻ vị trí của bạn với bên thứ ba.
            </p>

            <h4 className="font-bold text-slate-900 dark:text-white text-sm">2. Bộ nhớ cục bộ (Local Storage)</h4>
            <p>
              Các tùy chọn như Chế độ sáng/tối (Theme), Ngôn ngữ ưa thích (VI/EN), và Ngưỡng cảnh báo AQI cá nhân được lưu trữ an toàn trong LocalStorage của trình duyệt của bạn. Bạn có thể xóa dữ liệu này bất cứ lúc nào qua cài đặt trình duyệt.
            </p>

            <h4 className="font-bold text-slate-900 dark:text-white text-sm">3. Thông báo đẩy trình duyệt</h4>
            <p>
              AirVision VN sử dụng tiêu chuẩn Web Notifications API để gửi các cảnh báo khi không khí vượt mức ô nhiễm an toàn. Bạn có thể bật hoặc tắt quyền này bất cứ lúc nào trong bảng điều khiển thông báo hoặc trong cài đặt quyền trang web của trình duyệt.
            </p>

            <h4 className="font-bold text-slate-900 dark:text-white text-sm">4. Liên hệ bảo mật</h4>
            <p>
              Nếu có bất kỳ thắc mắc nào về chính sách bảo mật dữ liệu, xin vui lòng gửi email về: <strong>nguyentienduchuy2005@gmail.com</strong>.
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
