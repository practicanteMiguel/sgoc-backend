import {
  Entity, PrimaryGeneratedColumn, Column,
  ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn,
} from 'typeorm';
import { Requisicion } from './requisicion.entity';
import { Insumo } from './insumo.entity';

@Entity('requisicion_items')
export class RequisicionItem {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => Requisicion, req => req.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'requisicion_id' })
  requisicion!: Requisicion;

  @Column()
  requisicion_id!: string;

  @ManyToOne(() => Insumo, { eager: true })
  @JoinColumn({ name: 'insumo_id' })
  insumo!: Insumo;

  @Column()
  insumo_id!: string;

  @Column({ type: 'numeric', precision: 14, scale: 2, nullable: true })
  solicitado!: number | null;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at!: Date;
}
