import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { AdviceTopic } from './AdviceTopic.entity';

@Entity({ name: 'advice_items' })
@Index('idx_advice_items_topic_active_sort', ['topicId', 'isActive', 'sortOrder', 'id'])
export class AdviceItem {
  @PrimaryGeneratedColumn({ type: 'int' })
  id!: number;

  @Column({ name: 'topic_id', type: 'int' })
  topicId!: number;

  @ManyToOne(() => AdviceTopic, (topic) => topic.items, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'topic_id' })
  topic!: AdviceTopic;

  @Column({ name: 'content_vi', type: 'text' })
  contentVi!: string;

  @Column({ name: 'content_en', type: 'text', nullable: true })
  contentEn!: string | null;

  @Column({ name: 'sort_order', type: 'smallint', default: 0 })
  sortOrder!: number;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
