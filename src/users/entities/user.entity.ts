import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn, DeleteDateColumn,
  ManyToOne, OneToMany, JoinColumn,
} from 'typeorm';

import { UserRole } from '../../roles/entities/user-role.entity';
import { Session } from './session.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ unique: true })
  email!: string;

  @Column()
  password_hash!: string;

  @Column()
  first_name!: string;

  @Column()
  last_name!: string;

  @Column({ nullable: true })
  phone!: string;

  @Column()
  position!: string;

  @Column({ nullable: true })
  module!: string;

  @Column({ nullable: true })
  field!: string;

  @Column({ default: true })
  is_active!: boolean;

  @Column({ default: false })
  is_email_verified!: boolean;

  // true al crear el usuario — obliga cambio de contraseña en el primer login
  @Column({ default: true })
  is_first_login!: boolean;

  // token UUID temporal para verificar el correo — se borra al verificar
  @Column({ nullable: true })
  email_verification_token!: string;

  // última vez que el usuario cambió su contraseña
  @Column({ nullable: true, type: 'timestamptz' })
  password_changed_at!: Date;

  @Column({ nullable: true, type: 'timestamptz' })
  last_login_at!: Date;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'created_by' })
  created_by!: User;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at!: Date;

  @DeleteDateColumn({ type: 'timestamptz' })
  deleted_at!: Date;

  @OneToMany(() => UserRole, (ur) => ur.user)
  user_roles!: UserRole[];

  @OneToMany(() => Session, (s) => s.user)
  sessions!: Session[];
}