import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, ManyToOne, JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { AppModule } from './module.entity';

@Entity('user_module_access')
export class UserModuleAccess {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @ManyToOne(() => AppModule, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'module_id' })
  module!: AppModule;

  @Column({ default: true })
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