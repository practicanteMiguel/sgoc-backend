import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn,
  ManyToOne, OneToMany, JoinColumn, BeforeInsert,
} from 'typeorm';
import { randomUUID } from 'crypto';
import { Field } from '../../fields/entities/field.entity';
import { User } from '../../../users/entities/user.entity';
import { SolicitudDotacion } from './solicitud-dotacion.entity';

@Entity('dotacion_spaces')
export class DotacionSpace {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ unique: true })
  vault_token!: string;

  @BeforeInsert()
  generateToken() {
    if (!this.vault_token) this.vault_token = randomUUID();
  }

  @ManyToOne(() => Field, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'field_id' })
  field!: Field;

  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({ name: 'supervisor_id' })
  supervisor!: User;

  @OneToMany(() => SolicitudDotacion, (s) => s.space)
  solicitudes!: SolicitudDotacion[];

  @CreateDateColumn({ type: 'timestamptz' })
  created_at!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at!: Date;
}
