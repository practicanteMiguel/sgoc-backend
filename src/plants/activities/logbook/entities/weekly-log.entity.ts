import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn,
  ManyToOne, OneToMany, JoinColumn,
} from 'typeorm';
import { Crew } from '../../crews/entities/crew.entity';
import { LogActivity } from './log-activity.entity';
import { User } from '../../../../users/entities/user.entity';

@Entity('weekly_logs')
export class WeeklyLog {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => Crew, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'crew_id' })
  crew!: Crew;

  @Column({ type: 'int' })
  week_number!: number;

  @Column({ type: 'int' })
  year!: number;

  @OneToMany(() => LogActivity, (a) => a.weekly_log, { cascade: true })
  activities!: LogActivity[];

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'created_by' })
  created_by!: User;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at!: Date;
}
