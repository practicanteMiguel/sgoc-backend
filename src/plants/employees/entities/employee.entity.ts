import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn, DeleteDateColumn,
  ManyToOne, JoinColumn,
} from 'typeorm';
import { Field } from '../../fields/entities/field.entity';
import { User } from '../../../users/entities/user.entity';

export enum ScheduleType {
  SIX_BY_SIX = '6x6',
  FIVE_BY_TWO = '5x2',
}

@Entity('employees')
export class Employee {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ unique: true })
  identification_number!: string;

  @Column()
  first_name!: string;

  @Column()
  last_name!: string;

  @Column()
  position!: string;

  @Column({ default: false })
  aux_trans!: boolean;

  @Column({ default: false })
  aux_hab!: boolean;

  @Column({ default: false })
  aux_ali!: boolean;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  salario_base!: number;

  // '6x6' | '5x2' — puede tener ambos
  @Column({ type: 'text', array: true, default: [] })
  schedules!: ScheduleType[];

  @ManyToOne(() => Field, (f) => f.employees, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'field_id' })
  field!: Field;

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
