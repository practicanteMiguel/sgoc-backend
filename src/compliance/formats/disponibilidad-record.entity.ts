import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, ManyToOne, JoinColumn,
} from 'typeorm';
import { Deliverable } from '../deliverables/deliverable.entity';
import { Employee } from '../../plants/employees/entities/employee.entity';

@Entity('disponibilidad_records')
export class DisponibilidadRecord {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => Deliverable, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'deliverable_id' })
  deliverable!: Deliverable;

  @ManyToOne(() => Employee, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'employee_id' })
  employee!: Employee;

  @Column({ type: 'date' })
  fecha_inicio!: Date;

  @Column({ type: 'date' })
  fecha_final!: Date;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  valor_total!: number;

  @Column({ type: 'text', nullable: true })
  descripcion!: string;

  // Usuario o nombre de quien reporta la disponibilidad
  @Column({ nullable: true })
  quien_reporta!: string;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at!: Date;
}
