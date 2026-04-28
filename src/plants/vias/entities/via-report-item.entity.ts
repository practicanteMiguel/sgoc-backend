import {
  Entity, PrimaryGeneratedColumn, Column,
  ManyToOne, JoinColumn, CreateDateColumn,
} from 'typeorm';
import { ViaReport } from './via-report.entity';
import { ViaCapture } from './via-capture.entity';

export type ViaState = 'bueno' | 'regular' | 'malo' | 'critico';

@Entity('via_report_items')
export class ViaReportItem {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => ViaReport, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'report_id' })
  report!: ViaReport;

  @ManyToOne(() => ViaCapture, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'capture_id' })
  capture!: ViaCapture | null;

  @Column()
  via_name!: string;

  @Column({ type: 'varchar' })
  state!: ViaState;

  @Column({ nullable: true, type: 'text' })
  observations!: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at!: Date;
}
