import { DataSource } from 'typeorm';
import { Indumentaria } from '../../plants/indumentaria/entities/indumentaria.entity';

const ITEMS = [
  { codigo: 'IND-001', nombre: 'Casco de seguridad' },
  { codigo: 'IND-002', nombre: 'Capuchon soldadura' },
  { codigo: 'IND-003', nombre: 'Gafa oscura' },
  { codigo: 'IND-004', nombre: 'Gafa clara' },
  { codigo: 'IND-005', nombre: 'Careta gases' },
  { codigo: 'IND-006', nombre: 'Cartuchos gases' },
  { codigo: 'IND-007', nombre: 'Tipo copa' },
  { codigo: 'IND-008', nombre: 'Blue jean' },
  { codigo: 'IND-009', nombre: 'Camisa M.L.' },
  { codigo: 'IND-010', nombre: 'Overol' },
  { codigo: 'IND-011', nombre: 'Botas de cuero' },
  { codigo: 'IND-012', nombre: 'Botas de caucho' },
  { codigo: 'IND-013', nombre: 'Impermeable 3 piezas' },
  { codigo: 'IND-014', nombre: 'Careta soldador' },
];

export async function seedIndumentaria(dataSource: DataSource) {
  const repo = dataSource.getRepository(Indumentaria);
  let contador = 0;

  for (const item of ITEMS) {
    const existe = await repo.findOne({ where: { codigo: item.codigo } });
    if (existe) {
      console.log(`⏭️  Ya existe: ${item.codigo}`);
      continue;
    }
    await repo.save(repo.create({ ...item, unidad: 'UND', activo: true }));
    contador++;
  }

  console.log(`✅ Indumentaria: ${contador} items cargados`);
}
