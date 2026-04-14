import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn,
  ManyToOne, JoinColumn,
  Unique,
} from 'typeorm';
import { Field } from '../../plants/fields/entities/field.entity';
import { User } from '../../users/entities/user.entity';

export enum FormatType {
  TAXI           = 'taxi',
  PERNOCTACION   = 'pernoctacion',
  HORAS_EXTRA    = 'horas_extra',
  DISPONIBILIDAD = 'disponibilidad',
  SCHEDULE_6X6   = 'schedule_6x6',
  SCHEDULE_5X2   = 'schedule_5x2',
}

export enum DeliverableStatus {
  PENDIENTE        = 'pendiente',
  ENTREGADO        = 'entregado',
  ENTREGADO_TARDE  = 'entregado_tarde',
  NO_APLICA        = 'no_aplica',
}

// Todos los formatos que se esperan mensualmente por planta
export const REQUIRED_FORMATS = Object.values(FormatType);

@Entity('deliverables')
@Unique(['field', 'mes', 'anio', 'format_type'])
export class Deliverable {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

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

  @Column({ type: 'enum', enum: FormatType })
  format_type!: FormatType;

  @Column({ type: 'enum', enum: DeliverableStatus, default: DeliverableStatus.PENDIENTE })
  status!: DeliverableStatus;

  // Fecha limite de entrega (la define el sistema al generar el mes)
  @Column({ type: 'date', nullable: true })
  due_date!: Date;

  @Column({ type: 'timestamptz', nullable: true })
  submitted_at!: Date;

  // Razon por la cual no aplica ese formato ese mes (lo registra el supervisor/coordinador)
  @Column({ type: 'text', nullable: true })
  waive_reason!: string;

  // Quien marco el entregable como no_aplica
  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'waived_by' })
  waived_by!: User;

  // Ultimo coordinador/admin que abrio el modal de detalle del entregable
  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'last_viewed_by' })
  last_viewed_by!: User;

  @Column({ type: 'timestamptz', nullable: true })
  last_viewed_at!: Date;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at!: Date;
}
