import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn, OneToMany,
} from 'typeorm';
import { CategoriaInsumo } from './insumo.entity';
import { RequisicionItem } from './requisicion-item.entity';

export enum EstadoRequisicion {
  ABIERTA    = 'ABIERTA',
  COMPLETADA = 'COMPLETADA',
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

  @OneToMany(() => RequisicionItem, item => item.requisicion, { cascade: true })
  items!: RequisicionItem[];

  @CreateDateColumn({ type: 'timestamptz' })
  created_at!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at!: Date;
}
