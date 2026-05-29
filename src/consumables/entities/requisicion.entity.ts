import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn, OneToMany,
} from 'typeorm';
import { CategoriaInsumo } from './insumo.entity';
import { RequisicionItem } from './requisicion-item.entity';

export enum EstadoRequisicion {
  ABIERTA          = 'ABIERTA',
  APROBADA         = 'APROBADA',
  PEDIDO_REALIZADO = 'PEDIDO_REALIZADO',
  EN_BODEGA        = 'EN_BODEGA',
  ENTREGADO        = 'ENTREGADO',
  COMPLETADA       = 'COMPLETADA',
}

@Entity('requisiciones')
export class Requisicion {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  numero_rq!: number;

  @Column({ default: 45 })
  lote!: number;

  @Column({ type: 'enum', enum: CategoriaInsumo })
  categoria!: CategoriaInsumo;

  @Column({ type: 'varchar', nullable: true })
  lugar!: string | null;

  @Column({ type: 'date', nullable: true })
  fecha!: string | null;

  @Column({ type: 'varchar', nullable: true })
  nombre_solicitante!: string | null;

  @Column({ type: 'varchar', nullable: true })
  numero_contrato!: string | null;

  @Column({ type: 'enum', enum: EstadoRequisicion, default: EstadoRequisicion.ABIERTA })
  estado!: EstadoRequisicion;

  @Column({ type: 'text', nullable: true })
  firma_supervisor_url!: string | null;

  @Column({ type: 'text', nullable: true })
  firma_encargado_url!: string | null;

  @Column({ type: 'date', nullable: true })
  fecha_entrega!: string | null;

  @Column({ type: 'text', nullable: true })
  firma_recepcion_url!: string | null;

  @Column({ default: false })
  recepcion_completada!: boolean;

  @Column({ type: 'uuid', nullable: true })
  field_id!: string | null;

  @Column({ type: 'uuid', nullable: true })
  solicitud_id!: string | null;

  @OneToMany(() => RequisicionItem, item => item.requisicion, { cascade: true })
  items!: RequisicionItem[];

  @CreateDateColumn({ type: 'timestamptz' })
  created_at!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at!: Date;
}
