import {
  Entity, PrimaryGeneratedColumn, Column,
  ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn,
} from 'typeorm';
import { Solicitud } from './solicitud.entity';
import { CategoriaInsumo } from './insumo.entity';

@Entity('solicitud_adicionales')
export class SolicitudAdicional {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => Solicitud, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'solicitud_id' })
  solicitud!: Solicitud;

  @Column()
  solicitud_id!: string;

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

  @Column({ type: 'numeric', precision: 14, scale: 2 })
  solicitado!: number;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at!: Date;
}
