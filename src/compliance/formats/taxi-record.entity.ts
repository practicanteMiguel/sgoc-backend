import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, ManyToOne, JoinColumn,
} from 'typeorm';
import { Deliverable } from '../deliverables/deliverable.entity';
import { Employee } from '../../plants/employees/entities/employee.entity';

@Entity('taxi_records')
export class TaxiRecord {
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

  @Column()
  desde!: string;

  @Column()
  hasta!: string;

  @Column()
  trayecto_taxi!: string;

  @Column({ type: 'text', nullable: true })
  descripcion!: string;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at!: Date;
}
