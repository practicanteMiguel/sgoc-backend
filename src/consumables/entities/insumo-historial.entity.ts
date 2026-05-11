import {
  Entity, PrimaryGeneratedColumn, Column,
  ManyToOne, JoinColumn, CreateDateColumn,
} from 'typeorm';
import { Insumo } from './insumo.entity';

@Entity('insumos_historial')
export class InsumoHistorial {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => Insumo, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'insumo_id' })
  insumo!: Insumo;

  @Column()
  insumo_id!: string;

  @Column()
  campo!: string;

  @Column({ type: 'text', nullable: true })
  anterior!: string | null;

  @Column({ type: 'text', nullable: true })
  nuevo!: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  fecha!: Date;
}
