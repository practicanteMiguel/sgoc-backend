import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, ManyToOne, JoinColumn,
} from 'typeorm';
import { User } from './user.entity';

@Entity('sessions')
export class Session {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Column({ unique: true })
  refresh_token!: string;

  @Column({ nullable: true })
  ip_address!: string;

  @Column({ nullable: true, type: 'text' })
  user_agent!: string;

  @Column({ default: true })
  is_active!: boolean;

  @Column({ type: 'timestamptz' })
  expires_at!: Date;

  @Column({ nullable: true, type: 'timestamptz' })
  revoked_at!: Date;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at!: Date;
}