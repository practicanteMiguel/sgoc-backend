import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity('push_subscriptions')
export class PushSubscription {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  // URL única del servicio de push del navegador
  @Column({ type: 'text', unique: true })
  @Index()
  endpoint!: string;

  // Clave pública de cifrado (base64url)
  @Column({ type: 'text' })
  p256dh!: string;

  // Secreto de autenticación (base64url)
  @Column({ type: 'text' })
  auth!: string;

  // Info del dispositivo/navegador (opcional, para mostrar al usuario)
  @Column({ type: 'varchar', length: 300, nullable: true })
  user_agent!: string | null;

  @Column({ default: true })
  is_active!: boolean;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at!: Date;

  @Column({ type: 'timestamptz', nullable: true })
  last_used_at!: Date | null;
}
