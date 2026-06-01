import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn,
  ManyToOne, OneToMany, JoinColumn,
} from 'typeorm';
import { Field } from '../../fields/entities/field.entity';
import { DotacionSpace } from './dotacion-space.entity';
import { ReposicionDotacion } from './reposicion-dotacion.entity';

export enum EstadoSolicitudDotacion {
  EMITIDA    = 'emitida',
  AUTORIZADA = 'autorizada',
  GENERADA   = 'generada',
  ENTREGADA  = 'entregada',
}

@Entity('solicitudes_dotacion')
export class SolicitudDotacion {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => DotacionSpace, (s) => s.solicitudes, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'space_id' })
  space!: DotacionSpace;

  @ManyToOne(() => Field, { nullable: false })
  @JoinColumn({ name: 'campo_id' })
  campo!: Field;

  @Column()
  contrato!: string;

  @Column({ type: 'date' })
  fecha!: Date;

  @Column()
  inspeccion_realizada_por!: string;

  @Column()
  cargo_inspector!: string;

  @Column({
    type: 'enum',
    enum: EstadoSolicitudDotacion,
    default: EstadoSolicitudDotacion.EMITIDA,
  })
  estado!: EstadoSolicitudDotacion;

  @OneToMany(() => ReposicionDotacion, (r) => r.solicitud, { cascade: true })
  reposiciones!: ReposicionDotacion[];

  @CreateDateColumn({ type: 'timestamptz' })
  created_at!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at!: Date;
}
