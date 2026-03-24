import { DataSource } from 'typeorm';
import { Permission } from '../../roles/entities/permission.entity';

const MODULES = [
  'dashboard', 'vehicles', 'consumables',
  'tools', 'equipment', 'reports',
  'monitoring', 'users', 'settings',
];

const ACTIONS = ['view', 'create', 'edit', 'delete', 'export'];

export async function seedPermissions(dataSource: DataSource) {
  const repo = dataSource.getRepository(Permission);

  for (const mod of MODULES) {
    for (const action of ACTIONS) {
      const slug = `${mod}.${action}`;
      const exists = await repo.findOne({ where: { slug } });
      if (!exists) {
        await repo.save(repo.create({
          name: `${mod} - ${action}`,
          slug,
          module: mod,
          action,
          description: `Permiso para ${action} en ${mod}`,
        }));
        console.log(`✅ Permiso creado: ${slug}`);
      }
    }
  }
  console.log(`📋 Total permisos: ${MODULES.length * ACTIONS.length}`);
}