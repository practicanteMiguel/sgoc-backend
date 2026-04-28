import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn, DeleteDateColumn,
  ManyToOne, OneToMany, JoinColumn,
} from 'typeorm';
import { ViaMonthlyLog } from './via-monthly-log.entity';
import { User } from '../../../users/entities/user.entity';
import { ViaReportItem } from './via-report-item.entity';

export type ViaReportType = 'mensual' | 'urgente';

@Entity('via_reports')
export class ViaReport {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => ViaMonthlyLog, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'monthly_log_id' })
  monthly_log!: ViaMonthlyLog;

  @Column({ type: 'varchar', default: 'mensual' })
  type!: ViaReportType;

  @Column({ nullable: true, type: 'text' })
  general_observations!: string | null;

  @OneToMany(() => ViaReportItem, (i) => i.report, { cascade: true })
  items!: ViaReportItem[];

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'created_by' })
  created_by!: User;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at!: Date;

  @DeleteDateColumn({ type: 'timestamptz' })
  deleted_at!: Date;
}
