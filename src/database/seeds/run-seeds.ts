import { DataSource } from 'typeorm';

import * as dotenv from 'dotenv';
import { seedRoles } from './01-roles.seed';
import { seedPermissions } from './02-permissions.seed';
import { seedModules } from './03-modules.seed';
import { seedRolePermissions } from './04-role-permissions.seed';
import { seedAdmin } from './05-admin.seed';

dotenv.config();

const dataSource = new DataSource({
  type: 'postgres',
  host:     process.env.DB_HOST,
  port:     Number(process.env.DB_PORT),
  username: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  entities: ['src/**/*.entity.ts'],
  synchronize: true,
});

async function runSeeds() {
  await dataSource.initialize();
  console.log('🌱 Iniciando seeds...\n');

  await seedRoles(dataSource);
  await seedPermissions(dataSource);
  await seedModules(dataSource);
  await seedRolePermissions(dataSource);
  await seedAdmin(dataSource);

  console.log('\n🎉 Seeds completados correctamente');
  await dataSource.destroy();
}

runSeeds().catch(err => {
  console.error('❌ Error en seeds:', err);
  process.exit(1);
});