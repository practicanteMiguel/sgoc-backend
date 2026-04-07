import { DataSource } from 'typeorm';
import { Field } from '../../plants/fields/entities/field.entity';

const FIELDS = [
  {
    name:     'DINA',
    location: 'Km 17 vía Neiva – Bogotá, Huila.',
  },
  {
    name:     'PLANTA DE GAS',
    location: 'Km 17 vía Neiva – Bogotá, Huila.',
  },
  {
    name:     'RIO CEIBAS',
    location: 'Huila, zona rural/montañosa de Neiva.',
  },
  {
    name:     'SAN FRANCISCO',
    location: 'Km 17 vía Neiva – Bogotá, Huila.',
  },
  {
    name:     'TELLO',
    location: 'Norte del Huila, área de influencia del municipio de Tello.',
  },
  {
    name:     'YAGUARA',
    location: 'Municipio de Yaguará, Huila.',
  },
];

export async function seedFields(dataSource: DataSource) {
  const repo = dataSource.getRepository(Field);

  for (const data of FIELDS) {
    const exists = await repo.findOne({ where: { name: data.name } });
    if (!exists) {
      await repo.save(repo.create(data));
      console.log(`✅ Planta creada: ${data.name}`);
    } else {
      console.log(`⏭️  Planta ya existe: ${data.name}`);
    }
  }
}
