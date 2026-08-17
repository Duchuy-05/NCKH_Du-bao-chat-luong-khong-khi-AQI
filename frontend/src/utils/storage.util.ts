/**
 * Safe local storage utility
 */

export const StorageKeys = {
  THEME: 'airvision_theme',
  LANGUAGE: 'airvision_lang',
  NOTIFICATIONS: 'airvision_notifications',
  LAST_LOCATION: 'airvision_last_location',
  FAVORITE_STATIONS: 'airvision_favorites',
  ALERT_THRESHOLD: 'airvision_threshold',
} as const;

export function getStorageItem<T>(key: string, defaultValue: T): T {
  try {
    const item = localStorage.getItem(key);
    if (item === null) return defaultValue;
    return JSON.parse(item) as T;
  } catch (error) {
    console.warn(`Error reading localStorage key "${key}":`, error);
    return defaultValue;
  }
}

export function setStorageItem<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.warn(`Error setting localStorage key "${key}":`, error);
  }
}

export function removeStorageItem(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch (error) {
    console.warn(`Error removing localStorage key "${key}":`, error);
  }
}
