import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn, DeleteDateColumn,
  ManyToOne, OneToMany, JoinColumn,
} from 'typeorm';
import { User } from '../../../users/entities/user.entity';
import { Employee } from '../../employees/entities/employee.entity';

@Entity('fields')
export class Field {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ unique: true })
  name!: string;

  @Column()
  location!: string;

  @Column({ type: 'decimal', precision: 10, scale: 6, nullable: true })
  center_lat!: number | null;

  @Column({ type: 'decimal', precision: 10, scale: 6, nullable: true })
  center_lng!: number | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'supervisor_id' })
  supervisor!: User;

  @OneToMany(() => Employee, (e) => e.field)
  employees!: Employee[];

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'created_by' })
  created_by!: User;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at!: Date;

  @DeleteDateColumn({ type: 'timestamptz' })
  deleted_at!: Date;
}
