import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn, DeleteDateColumn,
  ManyToOne, ManyToMany, JoinTable, JoinColumn,
} from 'typeorm';
import { Field } from '../../../fields/entities/field.entity';
import { Employee } from '../../../employees/entities/employee.entity';
import { User } from '../../../../users/entities/user.entity';

@Entity('crews')
export class Crew {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  name!: string;

  @ManyToOne(() => Field, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'field_id' })
  field!: Field;

  @ManyToMany(() => Employee, { eager: false })
  @JoinTable({
    name: 'crew_employees',
    joinColumn:        { name: 'crew_id' },
    inverseJoinColumn: { name: 'employee_id' },
  })
  employees!: Employee[];

  @Column({ default: false })
  is_soldadura!: boolean;

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
