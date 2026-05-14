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

  @Column({ type: 'int', nullable: true })
  periodo_mes!: number | null;

  @Column({ type: 'int', nullable: true })
  periodo_anio!: number | null;

  @CreateDateColumn({ type: 'timestamptz' })
  fecha!: Date;
}
