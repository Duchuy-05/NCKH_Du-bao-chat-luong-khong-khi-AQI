import dotenv from 'dotenv';
dotenv.config();

export const envConfig = {
  // ── Server ────────────────────────────────────────────────────────────────
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT || '3000', 10),

  // ── Database ──────────────────────────────────────────────────────────────
  DB_HOST: process.env.DB_HOST || 'localhost',
  DB_PORT: parseInt(process.env.DB_PORT || '5432', 10),
  DB_NAME: process.env.DB_NAME || '',
  DB_USER: process.env.DB_USER || '',
  DB_PASSWORD: process.env.DB_PASSWORD || '',

  // ── Auth ──────────────────────────────────────────────────────────────────
  JWT_SECRET: process.env.JWT_SECRET || 'change_this_secret_in_production',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',

  // ── ML Service ────────────────────────────────────────────────────────────
  ML_SERVICE_URL: process.env.ML_SERVICE_URL || 'http://localhost:8000',
  ML_INTERNAL_API_KEY: process.env.ML_INTERNAL_API_KEY || '',
};
