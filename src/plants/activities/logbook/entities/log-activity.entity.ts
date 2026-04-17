import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn,
  ManyToOne, JoinColumn,
} from 'typeorm';
import { WeeklyLog } from './weekly-log.entity';

@Entity('log_activities')
export class LogActivity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => WeeklyLog, (w) => w.activities, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'weekly_log_id' })
  weekly_log!: WeeklyLog;

  @Column()
  description!: string;

  @Column({ type: 'date' })
  start_date!: Date;

  @Column({ type: 'date' })
  end_date!: Date;

  @Column({ nullable: true })
  image_before!: string;

  @Column({ nullable: true })
  image_during!: string;

  @Column({ nullable: true })
  image_after!: string;

  @Column({ nullable: true, type: 'text' })
  notes!: string;

  @Column({ nullable: true, type: 'text' })
  requirement!: string;

  @Column({ nullable: true, type: 'text' })
  additional_resource!: string;

  @Column({ nullable: true })
  progress!: string;

  @Column({ type: 'boolean', default: false })
  is_scheduled!: boolean;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at!: Date;
}
