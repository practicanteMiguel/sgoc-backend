import { DataSource } from 'typeorm';

import * as dotenv from 'dotenv';
import { seedRoles } from './01-roles.seed';
import { seedPermissions } from './02-permissions.seed';
import { seedModules } from './03-modules.seed';
import { seedRolePermissions } from './04-role-permissions.seed';
import { seedAdmin } from './05-admin.seed';
import { seedFields } from './06-fields.seed';
import { seedEmployeesDina } from './07-employees-dina.seed';
import { seedEmployeesPlanDeGas } from './08-employees-ptg.seed';
import { seedEmployeesRioCeibas } from './09-employees-rioceibas.seed';
import { seedEmployeesSanFrancisco } from './10-employees-sanfrancisco.seed';
import { seedEmployeesTello } from './11-employees-tello.seed';
import { seedEmployeesYaguara } from './12-employees-yaguara.seed';

dotenv.config();

const dataSource = new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
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
  await seedFields(dataSource);
  await seedEmployeesDina(dataSource);
  await seedEmployeesPlanDeGas(dataSource);
  await seedEmployeesRioCeibas(dataSource);
  await seedEmployeesSanFrancisco(dataSource);
  await seedEmployeesTello(dataSource);
  await seedEmployeesYaguara(dataSource);

  console.log('\n🎉 Seeds completados correctamente');
  await dataSource.destroy();
}

runSeeds().catch(err => {
  console.error('❌ Error en seeds:', err);
  process.exit(1);
});