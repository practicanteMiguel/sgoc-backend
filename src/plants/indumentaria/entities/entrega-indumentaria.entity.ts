import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn,
  ManyToOne, JoinColumn,
} from 'typeorm';
import { Employee } from '../../employees/entities/employee.entity';
import { Indumentaria } from './indumentaria.entity';
import { User } from '../../../users/entities/user.entity';

export enum TipoEntrega {
  TOCACION   = 'TOCACION',
  REPOSICION = 'REPOSICION',
}

@Entity('entregas_indumentaria')
export class EntregaIndumentaria {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => Employee, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'empleado_id' })
  empleado!: Employee;

  @ManyToOne(() => Indumentaria, { nullable: false })
  @JoinColumn({ name: 'indumentaria_id' })
  indumentaria!: Indumentaria;

  @Column({ type: 'enum', enum: TipoEntrega, default: TipoEntrega.TOCACION })
  tipo!: TipoEntrega;

  @Column({ type: 'int', default: 1 })
  cantidad!: number;

  @Column({ type: 'date' })
  fecha_entrega!: Date;

  @Column({ type: 'text', nullable: true })
  observacion!: string | null;

  @Column({ type: 'date', nullable: true })
  fecha_autorizacion!: Date | null;

  @Column({ type: 'date', nullable: true })
  fecha_solicitud_compras!: Date | null;

  @Column({ type: 'varchar', nullable: true })
  numero_rq!: string | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'registrado_por_id' })
  registrado_por!: User | null;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at!: Date;
}
