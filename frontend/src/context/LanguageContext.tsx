import React, { createContext, useContext, useEffect, useState } from 'react';
import { getStorageItem, setStorageItem, StorageKeys } from '../utils/storage.util';

export type Language = 'vi' | 'en';

interface LanguageContextType {
  lang: Language;
  setLang: (lang: Language) => void;
  toggleLang: () => void;
  t: (key: string) => string;
}

const translations: Record<Language, Record<string, string>> = {
  vi: {
    'nav.home': 'Trang chủ',
    'nav.maps': 'Bản đồ dự báo',
    'nav.forecast': 'Dự báo AQI',
    'nav.alerts': 'Khuyến cáo sức khỏe',
    'nav.about': 'Về chúng tôi',
    'footer.about': 'AirVision VN dự báo VN_AQI theo thành phố bằng mô hình SVR từ dữ liệu Open-Meteo đã xử lý.',
    'footer.quick_links': 'Liên kết',
    'footer.terms': 'Điều khoản sử dụng',
    'footer.privacy': 'Thông tin quyền riêng tư',
    'footer.rights': 'AirVision VN · Dự báo chất lượng không khí theo thành phố.',
  },
  en: {
    'nav.home': 'Home',
    'nav.maps': 'Forecast map',
    'nav.forecast': 'AQI forecast',
    'nav.alerts': 'Health advice',
    'nav.about': 'About us',
    'footer.about': 'AirVision VN provides city-level VN_AQI forecasts with SVR models trained on processed Open-Meteo data.',
    'footer.quick_links': 'Links',
    'footer.terms': 'Terms of use',
    'footer.privacy': 'Privacy information',
    'footer.rights': 'AirVision VN · City-level air-quality forecasts.',
  },
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [lang, setLangState] = useState<Language>(() => {
    const saved = getStorageItem<Language>(StorageKeys.LANGUAGE, 'vi');
    return saved === 'en' ? 'en' : 'vi';
  });

  useEffect(() => {
    setStorageItem(StorageKeys.LANGUAGE, lang);
  }, [lang]);

  const setLang = (newLang: Language) => setLangState(newLang);
  const toggleLang = () => setLangState((previous) => previous === 'vi' ? 'en' : 'vi');
  const t = (key: string) => translations[lang][key] || key;

  return (
    <LanguageContext.Provider value={{ lang, setLang, toggleLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) throw new Error('useLanguage must be used within a LanguageProvider');
  return context;
}
