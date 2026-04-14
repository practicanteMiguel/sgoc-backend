import { Entity, PrimaryGeneratedColumn, Column, Unique } from 'typeorm';

// Cachea los IDs de carpetas de Drive para no buscar en la API en cada subida.
// path_key ejemplos:
//   f:{field_id}
//   f:{field_id}/y:2026
//   f:{field_id}/y:2026/m:4
//   f:{field_id}/y:2026/m:4/c:ausentismo
@Entity('drive_folder_cache')
@Unique(['path_key'])
export class DriveFolderCache {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar' })
  path_key!: string;

  @Column({ type: 'varchar' })
  drive_folder_id!: string;
}
