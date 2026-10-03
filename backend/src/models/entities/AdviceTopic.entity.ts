import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  ManyToMany,
  JoinTable,
} from 'typeorm';
import { RiskLevel, TopicType } from './advice.enums';
import { AdviceItem } from './AdviceItem.entity';
import { AdviceSource } from './AdviceSource.entity';

@Entity({ name: 'advice_topics' })
export class AdviceTopic {
  @PrimaryGeneratedColumn({ type: 'int' })
  id!: number;

  @Column({
    name: 'topic_type',
    type: 'varchar',
    length: 30,
    default: TopicType.TARGET_GROUP,
  })
  topicType!: string;

  @Column({ type: 'varchar', length: 60, unique: true })
  slug!: string;

  @Column({ name: 'title_vi', type: 'varchar', length: 200 })
  titleVi!: string;

  @Column({ name: 'title_en', type: 'varchar', length: 200, nullable: true })
  titleEn!: string | null;

  @Column({ name: 'icon_key', type: 'varchar', length: 30, default: 'HeartPulse' })
  iconKey!: string;

  @Column({
    name: 'risk_level',
    type: 'varchar',
    length: 20,
    default: RiskLevel.MODERATE,
  })
  riskLevel!: 'low' | 'moderate' | 'high' | 'critical';

  @Column({ name: 'display_order', type: 'smallint', default: 0 })
  displayOrder!: number;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;

  @OneToMany(() => AdviceItem, (item) => item.topic)
  items!: AdviceItem[];

  @ManyToMany(() => AdviceSource, (source) => source.topics)
  @JoinTable({
    name: 'advice_topic_sources',
    joinColumn: { name: 'topic_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'source_id', referencedColumnName: 'id' },
  })
  sources!: AdviceSource[];
}
