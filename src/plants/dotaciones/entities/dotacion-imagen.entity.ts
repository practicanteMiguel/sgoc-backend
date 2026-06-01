import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, ManyToOne, JoinColumn,
} from 'typeorm';
import { ReposicionDotacion } from './reposicion-dotacion.entity';

@Entity('dotacion_imagenes')
export class DotacionImagen {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => ReposicionDotacion, (r) => r.imagenes, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'reposicion_id' })
  reposicion!: ReposicionDotacion;

  @Column()
  url!: string;

  @Column()
  public_id!: string;

  @Column()
  original_name!: string;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at!: Date;
}
