import { envConfig } from './env.config';

export const mlServiceConfig = {
  baseUrl: envConfig.ML_SERVICE_URL || 'http://localhost:8000',
  internalApiKey: envConfig.ML_INTERNAL_API_KEY || '',
  timeoutMs: 15000, // Timeout 15 giây phòng trường hợp model chạy lâu
};
