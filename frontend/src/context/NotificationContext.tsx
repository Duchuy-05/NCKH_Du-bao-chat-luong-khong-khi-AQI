import React, { createContext, useContext, useEffect, useState } from 'react';
import { getStorageItem, setStorageItem, StorageKeys } from '../utils/storage.util';
import { NotificationPreferences } from '../types/airQuality.types';

interface NotificationContextType {
  preferences: NotificationPreferences;
  updatePreferences: (partial: Partial<NotificationPreferences>) => void;
  requestBrowserPermission: () => Promise<boolean>;
  sendSimulatedAlert: (title: string, body: string, aqi: number) => void;
  currentToast: { id: string; title: string; body: string; aqi: number } | null;
  dismissToast: () => void;
}

const defaultPreferences: NotificationPreferences = {
  enabled: false,
  threshold: 100,
  location: 'Hà Nội',
  sound: true,
  dailySummary: true,
  summaryTime: '07:00',
};

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [preferences, setPreferencesState] = useState<NotificationPreferences>(() => {
    return getStorageItem<NotificationPreferences>(StorageKeys.NOTIFICATIONS, defaultPreferences);
  });

  const [currentToast, setCurrentToast] = useState<{ id: string; title: string; body: string; aqi: number } | null>(null);

  const updatePreferences = (partial: Partial<NotificationPreferences>) => {
    setPreferencesState((prev) => {
      const updated = { ...prev, ...partial };
      setStorageItem(StorageKeys.NOTIFICATIONS, updated);
      return updated;
    });
  };

  const requestBrowserPermission = async (): Promise<boolean> => {
    if (!('Notification' in window)) {
      updatePreferences({ enabled: true });
      return true;
    }

    try {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        updatePreferences({ enabled: true });
        sendSimulatedAlert(
          'AirVision VN: Đã kích hoạt thông báo',
          'Bạn sẽ nhận cảnh báo khi chất lượng không khí tại vị trí của bạn vượt ngưỡng quy định.',
          preferences.threshold
        );
        return true;
      }
    } catch (e) {
      console.warn('Notification permission error:', e);
    }
    // Fallback: enabled in-app notification toasts
    updatePreferences({ enabled: true });
    return true;
  };

  const sendSimulatedAlert = (title: string, body: string, aqi: number) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification(title, {
          body,
          icon: '/favicon.ico',
        });
      } catch (e) {
        console.warn('Native notification failed, using in-app toast:', e);
      }
    }

    // Also display in-app toast
    const toastId = Math.random().toString(36).substring(2, 9);
    setCurrentToast({ id: toastId, title, body, aqi });

    setTimeout(() => {
      setCurrentToast((curr) => (curr?.id === toastId ? null : curr));
    }, 6000);
  };

  const dismissToast = () => {
    setCurrentToast(null);
  };

  return (
    <NotificationContext.Provider
      value={{
        preferences,
        updatePreferences,
        requestBrowserPermission,
        sendSimulatedAlert,
        currentToast,
        dismissToast,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export function useNotification() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
}
