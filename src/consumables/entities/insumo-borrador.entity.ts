import {
  Entity, PrimaryGeneratedColumn, Column,
  ManyToOne, JoinColumn, UpdateDateColumn, Unique,
} from 'typeorm';
import { Insumo } from './insumo.entity';

@Entity('insumos_borradores')
@Unique(['insumo_id', 'mes', 'anio'])
export class InsumosBorrador {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => Insumo, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'insumo_id' })
  insumo!: Insumo;

  @Column()
  insumo_id!: string;

  @Column({ type: 'int' })
  mes!: number;

  @Column({ type: 'int' })
  anio!: number;

  @Column({ type: 'numeric', precision: 12, scale: 2, nullable: true })
  valor_unitario!: number | null;

  @Column({ type: 'varchar', nullable: true })
  proveedor_ordinario!: string | null;

  @Column({ type: 'varchar', nullable: true })
  proveedor_extraordinario!: string | null;

  @Column({ type: 'boolean', nullable: true })
  activo!: boolean | null;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at!: Date;
}
