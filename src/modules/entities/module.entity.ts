import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, ManyToOne, OneToMany, JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { RoleModuleAccess } from './role-module-access.entity';

@Entity('modules')
export class AppModule {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  name!: string;

  @Column({ unique: true })
  slug!: string;

  @Column({ nullable: true })
  icon!: string;

  @Column({ nullable: true })
  route!: string;

  @Column({ default: 0 })
  order_index!: number;

  @Column({ default: true })
  is_active!: boolean;

  @Column({ default: false })
  is_core!: boolean;

  @ManyToOne(() => AppModule, (m) => m.children, { nullable: true })
  @JoinColumn({ name: 'parent_id' })
  parent!: AppModule;

  @OneToMany(() => AppModule, (m) => m.parent)
  children!: AppModule[];

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'created_by' })
  created_by!: User;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at!: Date;

  @OneToMany(() => RoleModuleAccess, (rma) => rma.module)
  role_access!: RoleModuleAccess[];
}