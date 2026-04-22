import {
  Entity, PrimaryGeneratedColumn, Column,
  ManyToOne, JoinColumn, CreateDateColumn,
} from 'typeorm';
import { WeeklyLog } from '../../logbook/entities/weekly-log.entity';

@Entity('vault_images')
export class VaultImage {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => WeeklyLog, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'weekly_log_id' })
  weekly_log!: WeeklyLog;

  @Column()
  url!: string;

  @Column()
  public_id!: string;

  @Column()
  original_name!: string;

  @Column({ nullable: true })
  file_hash!: string;

  @Column({ default: false })
  is_assigned!: boolean;

  @CreateDateColumn({ type: 'timestamptz' })
  uploaded_at!: Date;
}
