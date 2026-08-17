import React from 'react';
import { useNotification } from '../context/NotificationContext';
import { getAQICategory } from '../utils/aqi.util';
import { Bell, X, ShieldAlert } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const NotificationToast: React.FC = () => {
  const { currentToast, dismissToast } = useNotification();

  if (!currentToast) return null;

  const category = getAQICategory(currentToast.aqi);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 50, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.95 }}
        className="fixed bottom-6 right-6 z-50 max-w-md w-full p-4 rounded-2xl shadow-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-start gap-3.5"
        style={{
          borderLeft: `5px solid ${category.color}`,
        }}
      >
        <div
          className="p-2.5 rounded-xl shrink-0"
          style={{ backgroundColor: category.bgColor, color: category.color }}
        >
          {currentToast.aqi > 150 ? <ShieldAlert className="w-5 h-5" /> : <Bell className="w-5 h-5" />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-1">
            <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate">
              {currentToast.title}
            </h4>
            <span
              className="text-xs px-2 py-0.5 rounded-full font-semibold shrink-0"
              style={{ backgroundColor: category.bgColor, color: category.textColor }}
            >
              AQI {Math.round(currentToast.aqi)}
            </span>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
            {currentToast.body}
          </p>
        </div>
        <button
          onClick={dismissToast}
          className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          title="Đóng"
        >
          <X className="w-4 h-4" />
        </button>
      </motion.div>
    </AnimatePresence>
  );
};
