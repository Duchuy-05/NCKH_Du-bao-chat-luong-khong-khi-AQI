/**
 * Format helper utilities
 */

export function formatAQI(val: number): string {
  return Math.round(val).toString();
}

export function formatTemperature(temp: number): string {
  return `${Math.round(temp)}°C`;
}

export function formatHumidity(val: number): string {
  return `${Math.round(val)}%`;
}

export function formatWindSpeed(speed: number, lang: 'vi' | 'en' = 'vi'): string {
  return `${speed.toFixed(1)} ${lang === 'vi' ? 'km/h' : 'km/h'}`;
}

export function formatPollutant(val: number, unit: string): string {
  return `${val.toFixed(1)} ${unit}`;
}

export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength).trim() + '...';
}

export function formatCompactNumber(num: number): string {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
  }
  return num.toString();
}
