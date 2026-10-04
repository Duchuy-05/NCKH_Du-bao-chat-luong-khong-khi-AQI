import type { HealthAdviceResponseData } from '../../types/healthAdvice.types';

const API_BASE_URL =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_BASE_URL) ||
  'http://localhost:3000/api';

export interface ApiEnvelope<T> {
  success: boolean;
  data?: T;
  message?: string;
}

export async function fetchHealthAdvice(timeoutMs: number = 8000): Promise<HealthAdviceResponseData> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(`${API_BASE_URL}/health-advice`, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    });

    let body: ApiEnvelope<HealthAdviceResponseData> | null = null;
    try {
      body = await res.json();
    } catch {}

    if (!res.ok || !body?.success || !body.data) {
      throw new Error(body?.message || `Lỗi tải khuyến cáo sức khỏe (HTTP ${res.status})`);
    }

    return body.data;
  } finally {
    clearTimeout(timeoutId);
  }
}
