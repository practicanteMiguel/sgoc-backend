import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, ManyToOne, JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity('audit_logs')
export class AuditLog {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Column()
  action!: string;

  @Column()
  entity_type!: string;

  @Column({ nullable: true })
  entity_id!: string;

  @Column({ nullable: true, type: 'jsonb' })
  old_values!: Record<string, any>;

  @Column({ nullable: true, type: 'jsonb' })
  new_values!: Record<string, any>;

  @Column({ nullable: true })
  ip_address!: string;

  @Column({ nullable: true })
  module!: string;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at!: Date;
}