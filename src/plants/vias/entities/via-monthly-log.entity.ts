import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn,
  ManyToOne, OneToMany, JoinColumn, BeforeInsert,
  Unique,
} from 'typeorm';
import { randomUUID } from 'crypto';
import { Field } from '../../fields/entities/field.entity';
import { User } from '../../../users/entities/user.entity';
import { ViaCaptureGroup } from './via-capture-group.entity';

@Entity('via_monthly_logs')
@Unique(['field', 'month', 'year'])
export class ViaMonthlyLog {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => Field, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'field_id' })
  field!: Field;

  @Column({ type: 'int' })
  month!: number;

  @Column({ type: 'int' })
  year!: number;

  @Column({ unique: true })
  vault_token!: string;

  @BeforeInsert()
  generateVaultToken() {
    if (!this.vault_token) this.vault_token = randomUUID();
  }

  @OneToMany(() => ViaCaptureGroup, (g) => g.monthly_log)
  capture_groups!: ViaCaptureGroup[];

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'created_by' })
  created_by!: User;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at!: Date;
}
