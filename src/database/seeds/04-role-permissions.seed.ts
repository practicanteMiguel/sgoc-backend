import { DataSource } from 'typeorm';
import { Role } from '../../roles/entities/role.entity';
import { Permission } from '../../roles/entities/permission.entity';
import { RolePermission } from '../../roles/entities/role-permission.entity';

const ALL_MODULES = ['dashboard','vehicles','consumables','tools','equipment','reports','monitoring','users','settings'];

export async function seedRolePermissions(dataSource: DataSource) {
  const roleRepo = dataSource.getRepository(Role);
  const permRepo = dataSource.getRepository(Permission);
  const rpRepo   = dataSource.getRepository(RolePermission);

  const roles = await roleRepo.find();
  const perms = await permRepo.find();

  const getRole = (slug: string) => roles.find(r => r.slug === slug)!;
  const getPerm = (slug: string) => perms.find(p => p.slug === slug)!;

  // ── ADMIN: todos los permisos ──────────────────────────────
  const admin = getRole('admin');
  for (const perm of perms) {
    const exists = await rpRepo.findOne({ where: { role: { id: admin.id }, permission: { id: perm.id } } });
    if (!exists) await rpRepo.save({ role: admin, permission: perm });
  }
  console.log('✅ admin: todos los permisos asignados');

  // ── COORDINATOR: view + export en todo ────────────────────
  const coord = getRole('coordinator');
  for (const modSlug of ALL_MODULES) {
    for (const action of ['view', 'export']) {
      const perm = getPerm(`${modSlug}.${action}`);
      if (perm) {
        const ex = await rpRepo.findOne({ where: { role: { id: coord.id }, permission: { id: perm.id } } });
        if (!ex) await rpRepo.save({ role: coord, permission: perm });
      }
    }
  }
  console.log('✅ coordinator: view + export asignados');

  // ── SUPERVISOR: view + export en dashboard, reports, monitoring ──
  const supervisor = getRole('supervisor');
  for (const modSlug of ['dashboard', 'reports', 'monitoring']) {
    for (const action of ['view', 'export']) {
      const perm = getPerm(`${modSlug}.${action}`);
      if (perm) {
        const ex = await rpRepo.findOne({ where: { role: { id: supervisor.id }, permission: { id: perm.id } } });
        if (!ex) await rpRepo.save({ role: supervisor, permission: perm });
      }
    }
  }
  console.log('✅ supervisor: permisos de lectura asignados');

  // ── MODULE_MANAGER: CRUD completo en módulos de negocio ───
  const manager = getRole('module_manager');
  const bizModules = ['vehicles','consumables','tools','equipment'];
  for (const modSlug of ['dashboard', ...bizModules, 'reports']) {
    const actions = bizModules.includes(modSlug)
      ? ['view','create','edit','delete','export']
      : ['view','export'];
    for (const action of actions) {
      const perm = getPerm(`${modSlug}.${action}`);
      if (perm) {
        const ex = await rpRepo.findOne({ where: { role: { id: manager.id }, permission: { id: perm.id } } });
        if (!ex) await rpRepo.save({ role: manager, permission: perm });
      }
    }
  }
  console.log('✅ module_manager: CRUD asignado');
}
