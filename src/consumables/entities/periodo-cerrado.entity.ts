import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, Unique,
} from 'typeorm';

@Entity('periodos_cerrados')
@Unique(['mes', 'anio'])
export class PeriodoCerrado {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'int' })
  mes!: number;

  @Column({ type: 'int' })
  anio!: number;

  @CreateDateColumn({ type: 'timestamptz' })
  cerrado_en!: Date;
}
