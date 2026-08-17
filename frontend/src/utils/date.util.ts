/**
 * Format datetime utilities for AirVision VN
 * e.g., 2024-01-15T10:30 -> 10:30 - 15/01/2024
 */

export function formatDateTime(isoStringOrDate?: string | Date, lang: 'vi' | 'en' = 'vi'): string {
  const d = isoStringOrDate ? new Date(isoStringOrDate) : new Date();
  if (isNaN(d.getTime())) return '';

  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();

  if (lang === 'vi') {
    return `${hours}:${minutes} - ${day}/${month}/${year}`;
  }
  return `${hours}:${minutes}, ${month}/${day}/${year}`;
}

export function formatDateShort(isoStringOrDate?: string | Date, lang: 'vi' | 'en' = 'vi'): string {
  const d = isoStringOrDate ? new Date(isoStringOrDate) : new Date();
  if (isNaN(d.getTime())) return '';

  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');

  if (lang === 'vi') {
    return `${day}/${month}`;
  }
  return `${month}/${day}`;
}

export function formatDayOfWeek(dateStr: string, lang: 'vi' | 'en' = 'vi'): string {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;

  const dayIndex = d.getDay();
  const viDays = ['Chủ nhật', 'Thứ hai', 'Thứ ba', 'Thứ tư', 'Thứ năm', 'Thứ sáu', 'Thứ bảy'];
  const enDays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  return lang === 'vi' ? viDays[dayIndex] : enDays[dayIndex];
}

export function getRelativeTime(timestamp: string, lang: 'vi' | 'en' = 'vi'): string {
  const diffMs = Date.now() - new Date(timestamp).getTime();
  const diffMins = Math.max(1, Math.floor(diffMs / 60000));

  if (diffMins < 60) {
    return lang === 'vi' ? `${diffMins} phút trước` : `${diffMins}m ago`;
  }
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) {
    return lang === 'vi' ? `${diffHours} giờ trước` : `${diffHours}h ago`;
  }
  const diffDays = Math.floor(diffHours / 24);
  return lang === 'vi' ? `${diffDays} ngày trước` : `${diffDays}d ago`;
}
