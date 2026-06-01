import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn,
  ManyToOne, OneToMany, JoinColumn,
} from 'typeorm';
import { Employee } from '../../employees/entities/employee.entity';
import { SolicitudDotacion } from './solicitud-dotacion.entity';
import { DotacionImagen } from './dotacion-imagen.entity';

@Entity('reposiciones_dotacion')
export class ReposicionDotacion {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => SolicitudDotacion, (s) => s.reposiciones, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'solicitud_id' })
  solicitud!: SolicitudDotacion;

  @ManyToOne(() => Employee, { nullable: false })
  @JoinColumn({ name: 'empleado_id' })
  empleado!: Employee;

  @Column({ type: 'text' })
  condicion_encontrada!: string;

  @Column({ type: 'date', nullable: true })
  fecha_entrega!: Date | null;

  @OneToMany(() => DotacionImagen, (i) => i.reposicion)
  imagenes!: DotacionImagen[];

  @CreateDateColumn({ type: 'timestamptz' })
  created_at!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at!: Date;
}
