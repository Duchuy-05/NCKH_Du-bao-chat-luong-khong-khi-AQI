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
    // Navigation
    'nav.home': 'Trang chủ',
    'nav.maps': 'Bản đồ AQI',
    'nav.forecast': 'Dự báo 7 ngày',
    'nav.alerts': 'Cảnh báo sức khỏe',
    'nav.about': 'Về chúng tôi',
    'nav.login': 'Đăng nhập',
    'nav.register': 'Đăng ký',
    'nav.logout': 'Đăng xuất',
    
    // Hero
    'hero.title': 'Dự báo Chất lượng Không khí & Thời tiết Việt Nam',
    'hero.subtitle': 'Giám sát chỉ số AQI thời gian thực từ hơn 150 trạm quan trắc chuẩn quốc gia',
    'hero.search_placeholder': 'Tìm kiếm thành phố, quận/huyện, trạm đo (vd: Hoàn Kiếm, Cầu Rồng, Bến Thành)...',
    'hero.allow_location': 'Vị trí của bạn',
    'hero.locating': 'Đang lấy vị trí...',
    'hero.location_detected': 'Đã định vị thành công',
    'hero.current_aqi': 'Chỉ số AQI hiện tại',
    'hero.last_updated': 'Cập nhật',
    'hero.temp': 'Nhiệt độ',
    'hero.feels_like': 'Cảm giác như',
    'hero.humidity': 'Độ ẩm',
    'hero.wind': 'Gió',
    'hero.uv': 'Chỉ số UV',
    'hero.pressure': 'Áp suất',
    'hero.visibility': 'Tầm nhìn',
    'hero.primary_pollutant': 'Chất ô nhiễm chính',

    // Quick Pollutants
    'pollutants.title': 'Chỉ số các chất ô nhiễm chi tiết',
    'pollutants.subtitle': 'Nồng độ thời gian thực so sánh với giới hạn an toàn WHO & QCVN',
    'pollutants.safe_limit': 'Ngưỡng an toàn',
    'pollutants.trend_up': 'Tăng so với 1h trước',
    'pollutants.trend_down': 'Giảm so với 1h trước',
    'pollutants.trend_stable': 'Ổn định',

    // Visual Charts
    'charts.title': 'Biểu đồ phân tích chất lượng không khí',
    'charts.tab_24h': 'Xu hướng AQI 24 giờ qua',
    'charts.tab_pollutants': 'So sánh các chất ô nhiễm',
    'charts.tab_temp': 'Dự báo nhiệt độ & độ ẩm 7 ngày',
    'charts.aqi_curve': 'Chỉ số AQI',
    'charts.pm25_curve': 'Bụi PM2.5 (µg/m³)',
    'charts.pm10_curve': 'Bụi PM10 (µg/m³)',

    // Heatmap
    'map.title': 'Bản đồ nhiệt chất lượng không khí Việt Nam',
    'map.subtitle': 'Quan sát trực quan phân bố ô nhiễm theo trạm và khu vực Bắc - Trung - Nam',
    'map.legend_title': 'Thang phân cấp AQI Việt Nam (QCVN 05:2023)',
    'map.view_full': 'Mở bản đồ toàn màn hình',
    'map.filter_all': 'Tất cả vùng',
    'map.filter_bac': 'Miền Bắc',
    'map.filter_trung': 'Miền Trung',
    'map.filter_nam': 'Miền Nam',

    // 7-day Table
    'table.title': 'Bảng dự báo chất lượng không khí 7 ngày tới',
    'table.col_day': 'Thứ / Ngày',
    'table.col_area': 'Khu vực',
    'table.col_level': 'Mức độ',
    'table.col_id': 'Mã dự báo',
    'table.col_aqi': 'Chỉ số AQI VN',
    'table.col_temp': 'Nhiệt độ (°C)',
    'table.col_condition': 'Thời tiết & Xu hướng',
    'table.filter_region': 'Lọc theo tỉnh thành:',

    // Health
    'health.title': 'Khuyến cáo sức khỏe theo nhóm đối tượng',
    'health.subtitle': 'Hướng dẫn hành động phòng ngừa tương ứng với chỉ số không khí hiện tại',
    
    // Notifications
    'notif.title': 'Thông báo đẩy theo vị trí của bạn',
    'notif.desc': 'Nhận cảnh báo sớm trên trình duyệt khi chỉ số AQI vượt quá ngưỡng bạn quan tâm.',
    'notif.enable_btn': 'Bật thông báo đẩy',
    'notif.enabled': 'Đã bật thông báo',
    'notif.threshold_label': 'Ngưỡng cảnh báo AQI:',
    'notif.test_btn': 'Thử gửi thông báo mẫu',
    'notif.saved': 'Đã lưu cấu hình thông báo',

    // Insights
    'insights.best_hours_title': 'Khung giờ ra ngoài tốt nhất trong ngày',
    'insights.city_compare_title': 'So sánh nhanh chất lượng không khí giữa các thành phố',
    'insights.tips_title': 'Mẹo bảo vệ sức khỏe & thanh lọc không khí trong nhà',

    // Footer
    'footer.about': 'AirVision VN là nền tảng số cung cấp dữ liệu quan trắc, dự báo chất lượng không khí và phân tích thời tiết tại Việt Nam do nhóm sinh viên Trường đại học Điện Lực phát triển.',
    'footer.quick_links': 'Liên kết nhanh',
    'footer.contact': 'Liên hệ & Trợ giúp',
    'footer.address': 'Trường đại học Điện Lực, 235 Đường Hoàng Quốc Việt, Nghĩa Đô, Hà Nội',
    'footer.hotline': 'Đường dây nóng: 0926008221 (24/7)',
    'footer.email': 'nguyentienduchuy2005@gmail.com',
    'footer.newsletter_title': 'Đăng ký nhận bản tin AQI hàng ngày',
    'footer.newsletter_desc': 'Nhận báo cáo tóm tắt chất lượng không khí mỗi sáng vào lúc 06:30.',
    'footer.newsletter_placeholder': 'Nhập email của bạn...',
    'footer.newsletter_btn': 'Đăng ký',
    'footer.newsletter_success': 'Cảm ơn bạn! Đã đăng ký thành công bản tin.',
    'footer.terms': 'Điều khoản sử dụng',
    'footer.privacy': 'Chính sách bảo mật',
    'footer.rights': 'Bản quyền thuộc về AirVision VN. Nhóm sinh viên trường đại học Điện Lực.',
  },
  en: {
    // Navigation
    'nav.home': 'Home',
    'nav.maps': 'AQI Maps',
    'nav.forecast': '7-Day Forecast',
    'nav.alerts': 'Health Alerts',
    'nav.about': 'About Us',
    'nav.login': 'Sign In',
    'nav.register': 'Sign Up',
    'nav.logout': 'Sign Out',

    // Hero
    'hero.title': 'Vietnam Air Quality & Weather Forecast',
    'hero.subtitle': 'Real-time AQI monitoring from over 150 standard environmental stations across Vietnam',
    'hero.search_placeholder': 'Search city, district, monitoring station (e.g., Hoan Kiem, Dragon Bridge, Ben Thanh)...',
    'hero.allow_location': 'Your Location',
    'hero.locating': 'Locating...',
    'hero.location_detected': 'Location Detected',
    'hero.current_aqi': 'Current AQI Index',
    'hero.last_updated': 'Updated',
    'hero.temp': 'Temperature',
    'hero.feels_like': 'Feels like',
    'hero.humidity': 'Humidity',
    'hero.wind': 'Wind',
    'hero.uv': 'UV Index',
    'hero.pressure': 'Pressure',
    'hero.visibility': 'Visibility',
    'hero.primary_pollutant': 'Main Pollutant',

    // Quick Pollutants
    'pollutants.title': 'Detailed Pollutants Breakdown',
    'pollutants.subtitle': 'Real-time concentrations benchmarked against WHO & VN national standards',
    'pollutants.safe_limit': 'Safe Limit',
    'pollutants.trend_up': 'Increased vs 1h ago',
    'pollutants.trend_down': 'Decreased vs 1h ago',
    'pollutants.trend_stable': 'Stable',

    // Visual Charts
    'charts.title': 'Air Quality Analytical Charts',
    'charts.tab_24h': '24-Hour AQI Trend',
    'charts.tab_pollutants': 'Pollutant Comparison',
    'charts.tab_temp': '7-Day Temp & Humidity',
    'charts.aqi_curve': 'AQI Value',
    'charts.pm25_curve': 'PM2.5 (µg/m³)',
    'charts.pm10_curve': 'PM10 (µg/m³)',

    // Heatmap
    'map.title': 'Vietnam Air Quality Real-Time Heatmap',
    'map.subtitle': 'Visual geographic pollution distribution across North, Central, and South regions',
    'map.legend_title': 'Vietnam National AQI Standard (QCVN 05:2023)',
    'map.view_full': 'Open Full Screen Map',
    'map.filter_all': 'All Regions',
    'map.filter_bac': 'Northern',
    'map.filter_trung': 'Central',
    'map.filter_nam': 'Southern',

    // 7-day Table
    'table.title': '7-Day Air Quality Forecast Table',
    'table.col_day': 'Day / Date',
    'table.col_area': 'Region',
    'table.col_level': 'Category',
    'table.col_id': 'Forecast ID',
    'table.col_aqi': 'VN AQI',
    'table.col_temp': 'Temp (°C)',
    'table.col_condition': 'Weather & Outlook',
    'table.filter_region': 'Filter by province:',

    // Health
    'health.title': 'Health Advisory by Target Group',
    'health.subtitle': 'Tailored preventive guidelines based on current atmospheric pollution levels',

    // Notifications
    'notif.title': 'Location-Based Push Notifications',
    'notif.desc': 'Get immediate alerts when ambient AQI in your area surpasses your configured safety threshold.',
    'notif.enable_btn': 'Enable Push Notifications',
    'notif.enabled': 'Notifications Active',
    'notif.threshold_label': 'AQI Alert Threshold:',
    'notif.test_btn': 'Simulate Sample Alert',
    'notif.saved': 'Notification preferences saved',

    // Insights
    'insights.best_hours_title': 'Best Outdoor Hours Today',
    'insights.city_compare_title': 'Quick AQI Comparison Across Major Cities',
    'insights.tips_title': 'Health Protection & Indoor Air Purifying Tips',

    // Footer
    'footer.about': 'AirVision VN is a digital platform providing air quality monitoring data, forecasts, and weather analysis in Vietnam, developed by a team of students from Electric Power University.',
    'footer.quick_links': 'Quick Links',
    'footer.contact': 'Contact & Support',
    'footer.address': 'Electric Power University, 235 Hoang Quoc Viet Street, Nghia Do, Hanoi',
    'footer.hotline': 'Hotline: 0926008221 (24/7)',
    'footer.email': 'nguyentienduchuy2005@gmail.com',
    'footer.newsletter_title': 'Subscribe to the daily AQI newsletter',
    'footer.newsletter_desc': 'Receive an air quality summary report every morning at 6:30 AM.',
    'footer.newsletter_placeholder': 'Enter your email...',
    'footer.newsletter_btn': 'Subscribe',
    'footer.newsletter_success': 'Thank you! You have successfully subscribed to the newsletter.',
    'footer.terms': 'Terms of Use',
    'footer.privacy': 'Privacy Policy',
    'footer.rights': 'Copyright © AirVision VN. Electric Power University Student Team.',
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

  const setLang = (newLang: Language) => {
    setLangState(newLang);
  };

  const toggleLang = () => {
    setLangState((prev) => (prev === 'vi' ? 'en' : 'vi'));
  };

  const t = (key: string): string => {
    return translations[lang][key] || key;
  };

  return (
    <LanguageContext.Provider value={{ lang, setLang, toggleLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
