import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, ManyToOne, JoinColumn,
} from 'typeorm';
import { Deliverable } from '../deliverables/deliverable.entity';
import { Employee } from '../../plants/employees/entities/employee.entity';

@Entity('horas_extra_records')
export class HorasExtraRecord {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => Deliverable, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'deliverable_id' })
  deliverable!: Deliverable;

  // cedula, nombre, cargo y sb vienen de employee
  @ManyToOne(() => Employee, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'employee_id' })
  employee!: Employee;

  @Column({ type: 'date' })
  fecha_reporte!: Date;

  @Column({ type: 'time', nullable: true })
  entrada!: string;

  @Column({ type: 'time', nullable: true })
  salida!: string;

  // Horas extras diurnas
  @Column({ type: 'decimal', precision: 8, scale: 2, default: 0 })
  hed!: number;

  // Horas extras nocturnas
  @Column({ type: 'decimal', precision: 8, scale: 2, default: 0 })
  hen!: number;

  // Horas festivas diurnas
  @Column({ type: 'decimal', precision: 8, scale: 2, default: 0 })
  hfd!: number;

  // Horas extras festivas diurnas
  @Column({ type: 'decimal', precision: 8, scale: 2, default: 0 })
  hefd!: number;

  // Horas extras festivas nocturnas
  @Column({ type: 'decimal', precision: 8, scale: 2, default: 0 })
  hefn!: number;

  // Recargo nocturno
  @Column({ type: 'decimal', precision: 8, scale: 2, default: 0 })
  rn!: number;

  @Column({ type: 'text', nullable: true })
  actividad!: string;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at!: Date;
}
