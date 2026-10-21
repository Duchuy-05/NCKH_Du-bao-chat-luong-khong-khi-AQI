export type CityCode = 'hanoi' | 'haiphong' | 'danang' | 'hochiminh' | 'cantho';
export type CityRegion = 'Bac' | 'Trung' | 'Nam';

export interface CityInfo {
  code: CityCode;
  nameVi: string;
  nameEn: string;
  region: CityRegion;
  latitude: number;
  longitude: number;
  mapX: number;
  mapY: number;
}

// Coordinates match the representative city points used by the backend importer.
export const CITIES: CityInfo[] = [
  {
    code: 'hanoi', nameVi: 'Hà Nội', nameEn: 'Hanoi', region: 'Bac',
    latitude: 21.0285, longitude: 105.8542, mapX: 44.5, mapY: 18,
  },
  {
    code: 'haiphong', nameVi: 'Hải Phòng', nameEn: 'Hai Phong', region: 'Bac',
    latitude: 20.8449, longitude: 106.6881, mapX: 51, mapY: 22.5,
  },
  {
    code: 'danang', nameVi: 'Đà Nẵng', nameEn: 'Da Nang', region: 'Trung',
    latitude: 16.0544, longitude: 108.2022, mapX: 62.5, mapY: 50,
  },
  {
    code: 'hochiminh', nameVi: 'TP. Hồ Chí Minh', nameEn: 'Ho Chi Minh City', region: 'Nam',
    latitude: 10.8231, longitude: 106.6297, mapX: 52, mapY: 80,
  },
  {
    code: 'cantho', nameVi: 'Cần Thơ', nameEn: 'Can Tho', region: 'Nam',
    latitude: 10.0452, longitude: 105.7469, mapX: 44, mapY: 83.1,
  },
];

export function getCityName(city: CityInfo, lang: 'vi' | 'en'): string {
  return lang === 'vi' ? city.nameVi : city.nameEn;
}
