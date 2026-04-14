import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, ManyToOne, JoinColumn,
} from 'typeorm';
import { Deliverable } from '../deliverables/deliverable.entity';
import { Employee } from '../../plants/employees/entities/employee.entity';

@Entity('pernoctacion_records')
export class PernoctacionRecord {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => Deliverable, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'deliverable_id' })
  deliverable!: Deliverable;

  @ManyToOne(() => Employee, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'employee_id' })
  employee!: Employee;

  @Column({ type: 'date' })
  fecha!: Date;

  // Valor por dia de pernoctacion
  @Column({ type: 'decimal', precision: 12, scale: 2 })
  vr_dia!: number;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at!: Date;
}
