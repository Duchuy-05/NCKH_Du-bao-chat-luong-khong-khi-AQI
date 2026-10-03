import { useState, useEffect, useCallback, useRef } from 'react';
import { fetchHealthAdvice } from '../services/apiClient/healthAdvice.api';
import type { HealthAdviceResponseData } from '../types/healthAdvice.types';

export function useHealthAdvice() {
  const [data, setData] = useState<HealthAdviceResponseData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const timerRef = useRef<any>(null);

  const loadAdvice = useCallback(async (isBackground: boolean = false) => {
    if (!isBackground) setIsLoading(true);
    setError(null);
    try {
      const result = await fetchHealthAdvice();
      setData(result);

      if (timerRef.current) clearTimeout(timerRef.current);
      const now = Date.now();
      const rotatesAtMs = new Date(result.rotatesAt).getTime();
      const delayMs = Math.max(1000, rotatesAtMs - now + Math.floor(Math.random() * 4000 + 1000));

      timerRef.current = setTimeout(() => {
        loadAdvice(true);
      }, delayMs);
    } catch (err: any) {
      setError(err.message || 'Không thể tải khuyến cáo sức khỏe');
    } finally {
      if (!isBackground) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAdvice();

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && data?.rotatesAt) {
        if (Date.now() > new Date(data.rotatesAt).getTime()) {
          loadAdvice(true);
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [loadAdvice, data?.rotatesAt]);

  const allTopics = data?.topics || [];
  const totalPages = Math.max(1, Math.ceil(allTopics.length / 4));
  const currentTopics = allTopics.slice((currentPage - 1) * 4, currentPage * 4);

  return {
    topics: currentTopics,
    allTopics,
    rotatesAt: data?.rotatesAt,
    isLoading,
    error,
    currentPage,
    totalPages,
    setCurrentPage,
    refetch: () => loadAdvice(false),
  };
}
