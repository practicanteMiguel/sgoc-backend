import {
  Entity, PrimaryGeneratedColumn, Column,
  ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn,
} from 'typeorm';
import { Solicitud } from './solicitud.entity';
import { Insumo } from './insumo.entity';

@Entity('solicitud_items')
export class SolicitudItem {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => Solicitud, s => s.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'solicitud_id' })
  solicitud!: Solicitud;

  @Column()
  solicitud_id!: string;

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
