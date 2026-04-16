import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn, DeleteDateColumn,
  ManyToOne, JoinColumn,
} from 'typeorm';
import { LogActivity } from '../../logbook/entities/log-activity.entity';
import { Crew } from '../../crews/entities/crew.entity';
import { User } from '../../../../users/entities/user.entity';

@Entity('technical_reports')
export class TechnicalReport {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => LogActivity, { nullable: false, onDelete: 'CASCADE', eager: false })
  @JoinColumn({ name: 'activity_id' })
  activity!: LogActivity;

  @ManyToOne(() => Crew, { nullable: false, onDelete: 'CASCADE', eager: false })
  @JoinColumn({ name: 'crew_id' })
  crew!: Crew;

  @Column({ nullable: true })
  additional_resource!: string;

  @Column({ nullable: true })
  requirement!: string;

  @Column({ nullable: true })
  progress!: string;

  @Column({ type: 'boolean', default: false })
  is_scheduled!: boolean;

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
