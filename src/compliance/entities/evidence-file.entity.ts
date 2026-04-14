import {
  Entity, PrimaryGeneratedColumn, Column,
  ManyToOne, JoinColumn, CreateDateColumn,
} from 'typeorm';
import { Field } from '../../plants/fields/entities/field.entity';
import { User } from '../../users/entities/user.entity';

export enum EvidenceCategory {
  AUSENTISMO   = 'ausentismo',
  LEY_50       = 'ley_50',
  DIA_FAMILIA  = 'dia_familia',
  HORAS_EXTRA  = 'horas_extra',
  CRONOGRAMA   = 'cronograma',
  GENERAL      = 'general',
}

@Entity('evidence_files')
export class EvidenceFile {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => Field, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'field_id' })
  field!: Field;

  @Column({ type: 'smallint', nullable: true })
  anio!: number | null;

  @Column({ type: 'smallint', nullable: true })
  mes!: number | null;

  @Column({ type: 'enum', enum: EvidenceCategory, nullable: true })
  category!: EvidenceCategory | null;

  @Column({ type: 'varchar' })
  file_name!: string;

  @Column({ type: 'varchar' })
  drive_file_id!: string;

  @Column({ type: 'varchar', nullable: true })
  drive_web_link!: string | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'uploaded_by' })
  uploaded_by!: User | null;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at!: Date;
}
