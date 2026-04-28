import {
  Entity, PrimaryGeneratedColumn, Column,
  ManyToOne, JoinColumn, CreateDateColumn,
} from 'typeorm';
import { ViaCaptureGroup } from './via-capture-group.entity';

@Entity('via_captures')
export class ViaCapture {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => ViaCaptureGroup, (g) => g.images, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'capture_group_id' })
  capture_group!: ViaCaptureGroup;

  @Column()
  url!: string;

  @Column()
  public_id!: string;

  @Column()
  original_name!: string;

  @Column({ nullable: true })
  file_hash!: string;

  @CreateDateColumn({ type: 'timestamptz' })
  uploaded_at!: Date;
}
