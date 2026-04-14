import {
  Entity, PrimaryGeneratedColumn, Column,
  ManyToOne, JoinColumn, Unique,
} from 'typeorm';
import { Schedule } from './schedule.entity';
import { Employee } from '../../plants/employees/entities/employee.entity';

// Convenciones de turno
export enum Turno {
  D    = 'D',    // Turno dia (6:00-18:00 / 07:00-14:30)
  N    = 'N',    // Turno noche (18:00-06:00)
  S    = 'S',    // Descanso
  DN   = 'DN',   // Turno noct festivo 6hrs (18:00-24:00)
  NS   = 'NS',   // Turno noct festivo 6hrs (00:01-06:00)
  DF   = 'DF',   // Dia de la familia
  AUS  = 'AUS',  // Ausentismo
  INC  = 'INC',  // Incapacidad
  DLD  = 'DLD',  // Descanso laborado de dia
  DLN  = 'DLN',  // Descanso laborado de noche
  L50  = 'L-50', // Dia ley 50
  VAC  = 'VAC',  // Vacaciones
  ANT  = 'ANT',  // Dias antiguedad
  LT   = 'LT',   // Licencia luto
  PS   = 'PS',   // Permiso sindical
}

@Entity('schedule_days')
@Unique(['schedule', 'employee', 'fecha'])
export class ScheduleDay {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => Schedule, (s) => s.days, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'schedule_id' })
  schedule!: Schedule;

  @ManyToOne(() => Employee, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'employee_id' })
  employee!: Employee;

  @Column({ type: 'date' })
  fecha!: Date;

  @Column({ type: 'enum', enum: Turno })
  turno!: Turno;
}
