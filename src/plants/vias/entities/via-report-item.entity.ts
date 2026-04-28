import {
  Entity, PrimaryGeneratedColumn, Column,
  ManyToOne, JoinColumn, CreateDateColumn,
} from 'typeorm';
import { ViaReport } from './via-report.entity';
import { ViaCaptureGroup } from './via-capture-group.entity';

export type ViaState = 'bueno' | 'regular' | 'malo' | 'critico';

@Entity('via_report_items')
export class ViaReportItem {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => ViaReport, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'report_id' })
  report!: ViaReport;

  @ManyToOne(() => ViaCaptureGroup, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'capture_group_id' })
  capture_group!: ViaCaptureGroup | null;

  @Column()
  via_name!: string;

  @Column({ type: 'varchar' })
  state!: ViaState;

  @Column({ nullable: true, type: 'text' })
  observations!: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at!: Date;
}
