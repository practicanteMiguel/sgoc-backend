import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn, OneToMany, ManyToOne, JoinColumn,
} from 'typeorm';
import { Field } from '../../plants/fields/entities/field.entity';
import { FieldLugar } from '../../plants/fields/entities/field-lugar.entity';
import { SolicitudItem } from './solicitud-item.entity';

export enum EstadoSolicitud {
  PENDIENTE  = 'PENDIENTE',
  COMPLETADA = 'COMPLETADA',
  GENERADA   = 'GENERADA',
}

@Entity('solicitudes')
export class Solicitud {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'int' })
  mes!: number;

  @Column({ type: 'int' })
  anio!: number;

  @Column({ type: 'uuid', nullable: true })
  field_id!: string | null;

  @ManyToOne(() => Field, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'field_id' })
  field!: Field | null;

  @Column({ type: 'uuid', nullable: true })
  field_lugar_id!: string | null;

  @ManyToOne(() => FieldLugar, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'field_lugar_id' })
  field_lugar!: FieldLugar | null;

  @Column({ type: 'varchar' })
  lugar!: string;

  @Column({ type: 'int', default: 45 })
  lote!: number;

  @Column({ type: 'date', nullable: true })
  fecha!: string | null;

  @Column({ type: 'varchar', nullable: true })
  nombre_solicitante!: string | null;

  @Column({ type: 'varchar', nullable: true })
  numero_contrato!: string | null;

  @Column({ type: 'enum', enum: EstadoSolicitud, default: EstadoSolicitud.PENDIENTE })
  estado!: EstadoSolicitud;

  @OneToMany(() => SolicitudItem, item => item.solicitud, { cascade: true })
  items!: SolicitudItem[];

  @CreateDateColumn({ type: 'timestamptz' })
  created_at!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at!: Date;
}
