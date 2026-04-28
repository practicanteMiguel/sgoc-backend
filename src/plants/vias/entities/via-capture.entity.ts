import {
  Entity, PrimaryGeneratedColumn, Column,
  ManyToOne, JoinColumn, CreateDateColumn,
} from 'typeorm';
import { ViaMonthlyLog } from './via-monthly-log.entity';
import { User } from '../../../users/entities/user.entity';

@Entity('via_captures')
export class ViaCapture {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => ViaMonthlyLog, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'monthly_log_id' })
  monthly_log!: ViaMonthlyLog;

  @Column()
  url!: string;

  @Column()
  public_id!: string;

  @Column()
  original_name!: string;

  @Column({ nullable: true })
  file_hash!: string;

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

  @CreateDateColumn({ type: 'timestamptz' })
  captured_at!: Date;
}
