import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, ManyToOne, JoinColumn,
} from 'typeorm';
import { Role } from '../../roles/entities/role.entity';
import { AppModule } from './module.entity';
import { User } from '../../users/entities/user.entity';

@Entity('role_module_access')
export class RoleModuleAccess {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => Role, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'role_id' })
  role!: Role;

  @ManyToOne(() => AppModule, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'module_id' })
  module!: AppModule;

  @Column({ default: false })
  can_view!: boolean;

  @Column({ default: false })
  can_create!: boolean;

  @Column({ default: false })
  can_edit!: boolean;

  @Column({ default: false })
  can_delete!: boolean;

  @Column({ default: false })
  can_export!: boolean;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'created_by' })
  created_by!: User;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at!: Date;
}