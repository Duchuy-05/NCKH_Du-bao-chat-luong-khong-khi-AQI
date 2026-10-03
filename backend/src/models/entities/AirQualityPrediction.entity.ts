import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  BaseEntity,
} from 'typeorm';

@Entity({ name: 'air_quality_predictions' })
export class AirQualityPrediction extends BaseEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar', length: 20 })
  type!: string;

  @Column({ type: 'varchar', length: 50, default: 'svr' })
  algo!: string;

  @Column({ type: 'varchar', length: 100, default: 'hanoi' })
  city!: string;

  @Column({ name: 'prediction_data', type: 'jsonb' })
  predictionData!: object;

  @Column({ name: 'generated_at', type: 'timestamptz' })
  generatedAt!: Date;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
