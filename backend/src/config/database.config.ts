import { Sequelize } from 'sequelize-typescript';
import { envConfig } from './env.config';
import { User } from '../models/entities/User.entity';

/**
 * Sequelize instance configured from environment variables.
 * Add new entity classes to the `models` array when created.
 */
export const sequelize = new Sequelize({
  dialect: 'postgres',         
  host: envConfig.DB_HOST,
  port: envConfig.DB_PORT,
  database: envConfig.DB_NAME,
  username: envConfig.DB_USER,
  password: envConfig.DB_PASSWORD,
  logging: envConfig.NODE_ENV === 'development' ? console.log : false,
  models: [
    User,
  ],
  define: {
    underscored: true,              // snake_case columns in DB
    timestamps: true,
  },
});

/**
 * Connect to the database and sync the schema.
 * Use `alter: true` in development so columns are updated automatically.
 * In production, use migrations instead of sync.
 */
export async function connectDatabase(): Promise<void> {
  await sequelize.authenticate();
  console.log('✅  Database connection established.');

  if (envConfig.NODE_ENV !== 'production') {
    await sequelize.sync({ alter: true });
    console.log('✅  Database schema synchronised (alter mode).');
  }
}
