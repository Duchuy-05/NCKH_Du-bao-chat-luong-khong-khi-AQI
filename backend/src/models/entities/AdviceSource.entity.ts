import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToMany,
} from 'typeorm';
import { AdviceTopic } from './AdviceTopic.entity';

@Entity({ name: 'advice_sources' })
export class AdviceSource {
  @PrimaryGeneratedColumn({ type: 'int' })
  id!: number;

  @Column({ type: 'varchar', length: 10, unique: true })
  code!: string;

  @Column({ type: 'text' })
  title!: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  publisher!: string | null;

  @Column({ name: 'published_year', type: 'smallint', nullable: true })
  publishedYear!: number | null;

  @Column({ type: 'text', nullable: true })
  url!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;

  @ManyToMany(() => AdviceTopic, (topic) => topic.sources)
  topics!: AdviceTopic[];
}
