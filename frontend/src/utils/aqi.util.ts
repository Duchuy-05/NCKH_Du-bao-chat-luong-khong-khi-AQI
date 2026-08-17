import { AQICategoryInfo, AQILevel } from '../types/airQuality.types';

export const AQI_VN_CATEGORIES: Record<AQILevel, AQICategoryInfo> = {
  good: {
    level: 'good',
    min: 0,
    max: 50,
    labelVi: 'Tốt',
    labelEn: 'Good',
    color: '#10B981', // green
    bgColor: 'rgba(16, 185, 129, 0.12)',
    textColor: '#047857',
    borderColor: '#10B981',
    descriptionVi: 'Chất lượng không khí đạt chuẩn, không ảnh hưởng tới sức khỏe.',
    descriptionEn: 'Air quality is satisfactory and poses little or no risk.',
    healthAdviceVi: 'Tuyệt vời cho các hoạt động thể thao ngoài trời và mở cửa thông gió tự nhiên.',
    healthAdviceEn: 'Ideal for outdoor physical activities and natural ventilation.',
  },
  moderate: {
    level: 'moderate',
    min: 51,
    max: 100,
    labelVi: 'Trung bình',
    labelEn: 'Moderate',
    color: '#F59E0B', // amber/yellow
    bgColor: 'rgba(245, 158, 11, 0.12)',
    textColor: '#B45309',
    borderColor: '#F59E0B',
    descriptionVi: 'Chất lượng không khí ở mức chấp nhận được.',
    descriptionEn: 'Air quality is acceptable for the general public.',
    healthAdviceVi: 'Nhóm người nhạy cảm nên cân nhắc giảm hoạt động mạnh ngoài trời kéo dài.',
    healthAdviceEn: 'Sensitive groups should consider reducing prolonged heavy outdoor exertion.',
  },
  unhealthy_sensitive: {
    level: 'unhealthy_sensitive',
    min: 101,
    max: 150,
    labelVi: 'Kém',
    labelEn: 'Unhealthy for Sensitive',
    color: '#F97316', // orange
    bgColor: 'rgba(249, 115, 22, 0.12)',
    textColor: '#C2410C',
    borderColor: '#F97316',
    descriptionVi: 'Nhóm người nhạy cảm (trẻ em, người già, người bệnh hô hấp) có thể bị ảnh hưởng.',
    descriptionEn: 'Sensitive groups may experience health effects.',
    healthAdviceVi: 'Đeo khẩu trang lọc bụi mịn (N95/KN95) khi ra đường. Trẻ em và người cao tuổi hạn chế ra ngoài.',
    healthAdviceEn: 'Wear fine dust masks (N95) outdoors. Children and the elderly should limit outdoor time.',
  },
  unhealthy: {
    level: 'unhealthy',
    min: 151,
    max: 200,
    labelVi: 'Xấu',
    labelEn: 'Unhealthy',
    color: '#EF4444', // red
    bgColor: 'rgba(239, 68, 68, 0.12)',
    textColor: '#B91C1C',
    borderColor: '#EF4444',
    descriptionVi: 'Mọi người bắt đầu cảm nhận tác động tiêu cực đến sức khỏe.',
    descriptionEn: 'Everyone may begin to experience adverse health effects.',
    healthAdviceVi: 'Hạn chế tối đa các hoạt động thể thao ngoài trời. Đóng cửa sổ và bật máy lọc không khí.',
    healthAdviceEn: 'Minimize outdoor sports. Close windows and turn on air purifiers.',
  },
  very_unhealthy: {
    level: 'very_unhealthy',
    min: 201,
    max: 300,
    labelVi: 'Rất xấu',
    labelEn: 'Very Unhealthy',
    color: '#8B5CF6', // purple
    bgColor: 'rgba(139, 92, 246, 0.14)',
    textColor: '#6D28D9',
    borderColor: '#8B5CF6',
    descriptionVi: 'Cảnh báo khẩn cấp: Tác động nghiêm trọng tới toàn bộ cộng đồng.',
    descriptionEn: 'Health alert: Risk of health effects is increased for everyone.',
    healthAdviceVi: 'Tránh hoàn toàn các hoạt động ngoài trời. Sử dụng máy lọc không khí liên tục.',
    healthAdviceEn: 'Avoid all outdoor activities. Run air purifiers continuously.',
  },
  hazardous: {
    level: 'hazardous',
    min: 301,
    max: 500,
    labelVi: 'Nguy hại',
    labelEn: 'Hazardous',
    color: '#78350F', // brown / maroon
    bgColor: 'rgba(120, 53, 15, 0.18)',
    textColor: '#78350F',
    borderColor: '#78350F',
    descriptionVi: 'Báo động nguy hại: Toàn bộ cư dân có nguy cơ bị ảnh hưởng sức khỏe nặng.',
    descriptionEn: 'Health warning of emergency conditions: Entire population is likely affected.',
    healthAdviceVi: 'Ở trong nhà, niêm phong khe cửa sổ, bật lọc khí cấp độ cao, chuẩn bị các thiết bị trợ thở nếu cần.',
    healthAdviceEn: 'Stay indoors, seal window gaps, set air purifier to high, keep respiratory aids handy.',
  },
};

export function getAQICategory(aqi: number): AQICategoryInfo {
  if (aqi <= 50) return AQI_VN_CATEGORIES.good;
  if (aqi <= 100) return AQI_VN_CATEGORIES.moderate;
  if (aqi <= 150) return AQI_VN_CATEGORIES.unhealthy_sensitive;
  if (aqi <= 200) return AQI_VN_CATEGORIES.unhealthy;
  if (aqi <= 300) return AQI_VN_CATEGORIES.very_unhealthy;
  return AQI_VN_CATEGORIES.hazardous;
}

export function getAQILevel(aqi: number): AQILevel {
  return getAQICategory(aqi).level;
}
