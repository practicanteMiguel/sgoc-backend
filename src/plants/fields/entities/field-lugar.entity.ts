import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn,
  ManyToOne, JoinColumn,
} from 'typeorm';
import { Field } from './field.entity';

@Entity('field_lugares')
export class FieldLugar {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  field_id!: string;

  @ManyToOne(() => Field, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'field_id' })
  field!: Field;

  @Column()
  nombre!: string;

  @Column({ type: 'decimal', precision: 14, scale: 2, nullable: true })
  presupuesto!: number | null;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at!: Date;
}
