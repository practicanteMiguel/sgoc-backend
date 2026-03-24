import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn,
  ManyToOne, OneToMany, JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { RolePermission } from './role-permission.entity';
import { RoleModuleAccess } from '../../modules/entities/role-module-access.entity';

@Entity('roles')
export class Role {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ unique: true })
  name!: string;

  @Column({ unique: true })
  slug!: string;

  @Column({ nullable: true, type: 'text' })
  description!: string;

  @Column({ default: true })
  is_active!: boolean;

  @Column({ default: false })
  is_system!: boolean;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'created_by' })
  created_by!: User;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at!: Date;

  @OneToMany(() => RolePermission, (rp) => rp.role)
  role_permissions!: RolePermission[];

  @OneToMany(() => RoleModuleAccess, (rma) => rma.role)
  module_access!: RoleModuleAccess[];
}