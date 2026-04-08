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

  @Column({ nullable: true })
  lugar_expedicion!: string;

  @Column({ nullable: true })
  fecha_expedicion_cedula!: Date;

  @Column()
  first_name!: string;

  @Column()
  last_name!: string;

  @Column({ nullable: true })
  lugar_nacimiento!: string;

  @Column({ nullable: true, type: 'date' })
  fecha_nacimiento!: Date;

  @Column({ nullable: true })
  estado_civil!: string;

  @Column({ nullable: true })
  celular!: string;

  @Column({ nullable: true })
  direccion!: string;

  @Column({ nullable: true })
  correo_electronico!: string;

  @Column({ nullable: true })
  formacion!: string;

  @Column()
  position!: string;

  @Column({ nullable: true })
  codigo_vacante!: string;

  @Column({ nullable: true, type: 'date' })
  fecha_inicio_contrato!: Date;

  @Column({ nullable: true, type: 'date' })
  fecha_retiro_contrato!: Date;

  @Column({ nullable: true })
  numero_prorroga!: string;

  @Column({ nullable: true })
  numero_otro_si!: string;

  @Column({ nullable: true })
  convenio!: string;

  @Column({ nullable: true })
  vigencia!: string;

  @Column({ default: false })
  aux_trans!: boolean;

  @Column({ default: false })
  aux_hab!: boolean;

  @Column({ default: false })
  aux_ali!: boolean;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  salario_base!: number;

  @Column({ nullable: true })
  eps!: string;

  @Column({ nullable: true })
  afp!: string;

  @Column({ nullable: true })
  banco!: string;

  @Column({ nullable: true })
  tipo_cuenta!: string;

  @Column({ nullable: true })
  numero_cuenta!: string;

  @Column({ nullable: true })
  afiliacion_sindicato!: string;

  @Column({ nullable: true })
  inclusion!: string;

  @Column({ default: true })
  is_active!: boolean;

  // Certificado de residencia
  @Column({ nullable: true })
  lugar_exp_certificado_residencia!: string;

  @Column({ nullable: true, type: 'date' })
  fecha_exp_certificado_residencia!: Date;

  @Column({ nullable: true, type: 'date' })
  vencimiento_certificado_residencia!: Date;

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
