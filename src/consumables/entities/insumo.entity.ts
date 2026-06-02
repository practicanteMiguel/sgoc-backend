import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn,
} from 'typeorm';

export enum CategoriaInsumo {
  PAPELERIA  = 'PAPELERIA',
  CONSUMIBLE = 'CONSUMIBLE',
  EPP        = 'EPP',
  DOTACION   = 'DOTACION',
}

@Entity('insumos')
export class Insumo {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ unique: true })
  codigo!: string;

  @Column()
  descripcion!: string;

  @Column()
  unidad!: string;

  @Column({ type: 'numeric', precision: 14, scale: 2, nullable: true })
  valor_unitario!: number | null;

  @Column({ type: 'enum', enum: CategoriaInsumo })
  categoria!: CategoriaInsumo;

  @Column({ type: 'varchar', nullable: true })
  proveedor_ordinario!: string | null;

  @Column({ type: 'varchar', nullable: true })
  proveedor_extraordinario!: string | null;

  @Column({ default: true })
  activo!: boolean;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at!: Date;
}
