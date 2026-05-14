import {
  Entity, PrimaryGeneratedColumn, Column,
  ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn,
} from 'typeorm';
import { Requisicion } from './requisicion.entity';
import { CategoriaInsumo } from './insumo.entity';

@Entity('requisicion_adicionales')
export class RequisicionItemAdicional {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => Requisicion, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'requisicion_id' })
  requisicion!: Requisicion;

  @Column()
  requisicion_id!: string;

  @Column({ type: 'enum', enum: CategoriaInsumo })
  categoria!: CategoriaInsumo;

  @Column({ type: 'varchar' })
  descripcion!: string;

  @Column({ type: 'varchar' })
  unidad!: string;

  @Column({ type: 'numeric', precision: 14, scale: 2, nullable: true })
  valor_unitario!: number | null;

  @Column({ type: 'varchar', nullable: true })
  proveedor!: string | null;

  @Column({ type: 'numeric', precision: 14, scale: 2, nullable: true })
  solicitado!: number | null;

  @Column({ type: 'varchar', nullable: true })
  numero_factura!: string | null;

  @Column({ type: 'numeric', precision: 14, scale: 2, nullable: true })
  precio_real!: number | null;

  @Column({ type: 'varchar', nullable: true })
  proveedor_factura!: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at!: Date;
}
