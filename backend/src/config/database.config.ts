import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { envConfig } from './env.config';
import { User } from '../models/entities/User.entity';
import { AirQualityPrediction } from '../models/entities/AirQualityPrediction.entity';

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: envConfig.DB_HOST,
  port: envConfig.DB_PORT,
  username: envConfig.DB_USER,
  password: envConfig.DB_PASSWORD,
  database: envConfig.DB_NAME,
  synchronize: false,
  logging: envConfig.NODE_ENV === 'development' ? ['error', 'warn'] : false,
  entities: [User, AirQualityPrediction],
  migrations: [],
  subscribers: [],
});

export async function connectDatabase(): Promise<void> {
  try {
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
      console.log('✅  Kết nối cơ sở dữ liệu PostgreSQL (TypeORM DataSource) thành công.');
    }
  } catch (error) {
    console.error('❌  Khởi động TypeORM DataSource thất bại:', error);
    throw error;
  }
}
