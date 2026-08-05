import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Employee } from '../../employees/entities/employee.entity';
import { Indumentaria } from './indumentaria.entity';
import { User } from '../../../users/entities/user.entity';

export enum TipoEntrega {
  TOCACION = 'TOCACION',
  REPOSICION = 'REPOSICION',
  PERIODICA = 'PERIODICA',
}

@Entity('entregas_indumentaria')
@Index(['empleado_id', 'indumentaria_id', 'fecha_entrega'])
export class EntregaIndumentaria {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  empleado_id!: string;

  @ManyToOne(() => Employee, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'empleado_id' })
  empleado!: Employee;

  @Column({ type: 'uuid' })
  indumentaria_id!: string;

  @ManyToOne(() => Indumentaria, { nullable: false })
  @JoinColumn({ name: 'indumentaria_id' })
  indumentaria!: Indumentaria;

  @Column({ type: 'enum', enum: TipoEntrega, default: TipoEntrega.TOCACION })
  tipo!: TipoEntrega;

  @Column({ type: 'int', default: 1 })
  cantidad!: number;

  // Valor unitario congelado al momento de registrar la entrega (precio de la
  // RQ mas cercana en el tiempo para este item). No se recalcula despues,
  // aunque se creen nuevas RQs con otro precio para el mismo item.
  @Column({ type: 'numeric', precision: 14, scale: 2, nullable: true })
  valor_unitario!: number | null;

  @Column({ type: 'varchar', nullable: true })
  talla!: string | null;

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

  @Column({ type: 'text', nullable: true })
  firma_url!: string | null;

  @Column({ type: 'uuid', nullable: true })
  entrega_batch_id!: string | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'registrado_por_id' })
  registrado_por!: User | null;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at!: Date;
}
