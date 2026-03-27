import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AppModule } from './entities/module.entity';

import { RolePermission } from '../roles/entities/role-permission.entity';

@Injectable()
export class ModulesService {
  constructor(
    @InjectRepository(AppModule)
    private moduleRepo: Repository<AppModule>,
    @InjectRepository(RolePermission)
    private rpRepo: Repository<RolePermission>,
  ) {}

  findAll() {
    return this.moduleRepo.find({
      where: { is_active: true },
      order: { order_index: 'ASC' },
    });
  }

  // Devuelve los módulos accesibles para un rol, con can_* derivados de role_permissions
  async findByRole(roleSlug: string) {
    // 1. Traer todos los permisos activos del rol
    const rolePerms = await this.rpRepo.find({
      where: { role: { slug: roleSlug } },
      relations: ['permission', 'role'],
    });

    // 2. Agrupar por módulo → set de actions que tiene el rol
    //    Ejemplo: { dashboard: Set{'view','export'}, reports: Set{'view','create','edit','export'} }
    const permsByModule = new Map<string, Set<string>>();
    for (const rp of rolePerms) {
      const mod = rp.permission.module;   // 'dashboard', 'reports', etc.
      const act = rp.permission.action;  // 'view', 'create', 'edit', 'delete', 'export'
      if (!permsByModule.has(mod)) permsByModule.set(mod, new Set());
      permsByModule.get(mod)!.add(act);
    }

    // 3. Solo incluir módulos donde el rol tenga acción 'view'
    const visibleSlugs = [...permsByModule.entries()]
      .filter(([, actions]) => actions.has('view'))
      .map(([slug]) => slug);

    if (visibleSlugs.length === 0) return [];

    // 4. Traer los módulos activos que coincidan
    const modules = await this.moduleRepo
      .createQueryBuilder('m')
      .where('m.is_active = true')
      .andWhere('m.slug IN (:...slugs)', { slugs: visibleSlugs })
      .orderBy('m.order_index', 'ASC')
      .getMany();

    // 5. Mapear can_* desde los permisos del rol
    return modules.map((mod) => {
      const actions = permsByModule.get(mod.slug) ?? new Set<string>();
      return {
        ...mod,
        can_create: actions.has('create'),
        can_edit:   actions.has('edit'),
        can_delete: actions.has('delete'),
        can_export: actions.has('export'),
      };
    });
  }

  // Para el sidebar del usuario autenticado
  async findMyModules(roles: string[]) {
    if (roles.includes('admin')) return this.findAll();

    const results = await Promise.all(roles.map((r) => this.findByRole(r)));

    // Deduplicar por slug — si el usuario tiene varios roles, gana el más permisivo
    const map = new Map<string, any>();
    for (const mod of results.flat()) {
      if (!map.has(mod.slug)) {
        map.set(mod.slug, { ...mod });
      } else {
        // Merge: OR de cada can_* para que el rol más permisivo gane
        const existing = map.get(mod.slug);
        map.set(mod.slug, {
          ...existing,
          can_create: existing.can_create || mod.can_create,
          can_edit:   existing.can_edit   || mod.can_edit,
          can_delete: existing.can_delete || mod.can_delete,
          can_export: existing.can_export || mod.can_export,
        });
      }
    }

    return [...map.values()];
  }
}