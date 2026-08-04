import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { Employee } from '../../employees/entities/employee.entity';

export enum TallaCategoria {
  PANTALON = 'PANTALON',
  CAMISA = 'CAMISA',
  OVEROL = 'OVEROL',
  CALZADO = 'CALZADO',
}

@Entity('empleado_tallas')
@Unique(['empleado_id', 'categoria'])
export class EmpleadoTalla {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  empleado_id!: string;

  @ManyToOne(() => Employee, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'empleado_id' })
  empleado!: Employee;

  @Column({ type: 'enum', enum: TallaCategoria })
  categoria!: TallaCategoria;

  @Column({ type: 'varchar', nullable: true })
  talla!: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at!: Date;
}
