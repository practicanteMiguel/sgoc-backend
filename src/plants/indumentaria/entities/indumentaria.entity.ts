import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn,
} from 'typeorm';

@Entity('indumentaria')
export class Indumentaria {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ unique: true })
  codigo!: string;

  @Column()
  nombre!: string;

  @Column({ type: 'numeric', precision: 14, scale: 2, nullable: true })
  valor_unitario!: number | null;

  @Column({ nullable: true, type: 'varchar' })
  proveedor!: string | null;

  @Column({ default: 'UND' })
  unidad!: string;

  @Column({ default: true })
  activo!: boolean;

  @Column({ default: false })
  requiere_talla!: boolean;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at!: Date;
}
