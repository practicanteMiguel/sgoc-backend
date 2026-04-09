import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn,
  ManyToOne, OneToMany, JoinColumn,
  Unique,
} from 'typeorm';
import { Field } from '../../plants/fields/entities/field.entity';
import { User } from '../../users/entities/user.entity';
import { Deliverable } from './deliverable.entity';
import { ScheduleDay } from './schedule-day.entity';

export enum ScheduleTipo {
  SIX_BY_SIX = '6x6',
  FIVE_BY_TWO = '5x2',
}

export enum ScheduleEstado {
  BORRADOR = 'borrador',
  CERRADO  = 'cerrado',
}

@Entity('schedules')
@Unique(['field', 'mes', 'anio', 'tipo'])
export class Schedule {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  // Vincula con el entregable del mes para el cumplimiento
  @ManyToOne(() => Deliverable, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'deliverable_id' })
  deliverable!: Deliverable;

  @ManyToOne(() => Field, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'field_id' })
  field!: Field;

  @ManyToOne(() => User, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'supervisor_id' })
  supervisor!: User;

  @Column({ type: 'smallint' })
  mes!: number; // 1-12

  @Column({ type: 'smallint' })
  anio!: number;

  @Column({ type: 'enum', enum: ScheduleEstado, default: ScheduleEstado.BORRADOR })
  estado!: ScheduleEstado;

  @Column({ type: 'enum', enum: ScheduleTipo })
  tipo!: ScheduleTipo;

  @OneToMany(() => ScheduleDay, (d) => d.schedule, { cascade: true })
  days!: ScheduleDay[];

  @CreateDateColumn({ type: 'timestamptz' })
  created_at!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at!: Date;
}
