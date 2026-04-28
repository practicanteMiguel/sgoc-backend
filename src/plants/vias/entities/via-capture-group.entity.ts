import {
  Entity, PrimaryGeneratedColumn, Column,
  ManyToOne, OneToMany, JoinColumn, CreateDateColumn,
} from 'typeorm';
import { ViaMonthlyLog } from './via-monthly-log.entity';
import { ViaCapture } from './via-capture.entity';
import { User } from '../../../users/entities/user.entity';

@Entity('via_capture_groups')
export class ViaCaptureGroup {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => ViaMonthlyLog, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'monthly_log_id' })
  monthly_log!: ViaMonthlyLog;

  @Column({ type: 'decimal', precision: 10, scale: 6, nullable: true })
  lat!: number | null;

  @Column({ type: 'decimal', precision: 10, scale: 6, nullable: true })
  lng!: number | null;

  @Column({ type: 'varchar', nullable: true })
  via_name!: string | null;

  @Column({ type: 'varchar', nullable: true })
  comment!: string | null;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'taken_by' })
  taken_by!: User | null;

  @OneToMany(() => ViaCapture, (c) => c.capture_group, { cascade: true })
  images!: ViaCapture[];

  @CreateDateColumn({ type: 'timestamptz' })
  captured_at!: Date;
}
