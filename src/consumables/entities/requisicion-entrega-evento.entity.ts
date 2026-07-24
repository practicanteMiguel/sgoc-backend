import {
  Entity, PrimaryGeneratedColumn, Column,
  ManyToOne, JoinColumn, CreateDateColumn,
} from 'typeorm';
import { Requisicion } from './requisicion.entity';

@Entity('requisicion_entrega_eventos')
export class RequisicionEntregaEvento {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => Requisicion, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'requisicion_id' })
  requisicion!: Requisicion;

  @Column()
  requisicion_id!: string;

  @Column({ type: 'date' })
  fecha_entrega!: string;

  @Column({ type: 'text', nullable: true })
  firma_url!: string | null;

  @Column({ type: 'uuid', nullable: true })
  usuario_id!: string | null;

  @Column({ type: 'numeric', precision: 14, scale: 2 })
  total_solicitado!: number;

  @Column({ type: 'numeric', precision: 14, scale: 2 })
  total_recibido!: number;

  @Column({ default: false })
  entrega_completa!: boolean;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at!: Date;
}
