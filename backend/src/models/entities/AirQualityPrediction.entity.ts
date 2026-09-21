import {
  Table,
  Column,
  Model,
  DataType,
  CreatedAt,
  UpdatedAt,
  AllowNull,
  Default,
} from 'sequelize-typescript';

@Table({
  tableName: 'air_quality_predictions',
  timestamps: true,
  underscored: true,
})
export class AirQualityPrediction extends Model {
  @Column({
    type: DataType.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  })
  declare id: number;

  @AllowNull(false)
  @Column({
    type: DataType.STRING(20),
    comment: 'Loại dự báo: daily hoặc hourly',
  })
  declare type: string;

  @AllowNull(false)
  @Default('svr')
  @Column({
    type: DataType.STRING(50),
    comment: 'Thuật toán sử dụng: svr',
  })
  declare algo: string;

  @AllowNull(false)
  @Default('hanoi')
  @Column({
    type: DataType.STRING(100),
    comment: 'Thành phố hoặc trạm đo',
  })
  declare city: string;

  @AllowNull(false)
  @Column({
    type: DataType.JSONB,
    field: 'prediction_data',
    comment: 'Toàn bộ dữ liệu dự báo trả về từ ml-service',
  })
  declare predictionData: object;

  @AllowNull(false)
  @Column({
    type: DataType.DATE,
    field: 'generated_at',
    comment: 'Thời điểm ml-service khởi tạo kết quả',
  })
  declare generatedAt: Date;

  @CreatedAt
  @Column({ field: 'created_at' })
  declare createdAt: Date;

  @UpdatedAt
  @Column({ field: 'updated_at' })
  declare updatedAt: Date;
}
