import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AppModule } from './entities/module.entity';
import { UserModuleAccess } from './entities/user-module.entity';
import { RolePermission } from '../roles/entities/role-permission.entity';

@Injectable()
export class ModulesService {
  constructor(
    @InjectRepository(AppModule)
    private moduleRepo: Repository<AppModule>,
    @InjectRepository(UserModuleAccess)
    private userAccessRepo: Repository<UserModuleAccess>,
    @InjectRepository(RolePermission)
    private rpRepo: Repository<RolePermission>,
  ) {}

  findAll() {
    return this.moduleRepo.find({
      where: { is_active: true },
      order: { order_index: 'ASC' },
    });
  }

  // Módulos por rol — derivados de role_permissions
  async findByRole(roleSlug: string) {
    const rolePerms = await this.rpRepo.find({
      where: { role: { slug: roleSlug } },
      relations: ['permission', 'role'],
    });

    const permsByModule = new Map<string, Set<string>>();
    for (const rp of rolePerms) {
      const mod = rp.permission.module;
      const act = rp.permission.action;
      if (!permsByModule.has(mod)) permsByModule.set(mod, new Set());
      permsByModule.get(mod)!.add(act);
    }

    const visibleSlugs = [...permsByModule.entries()]
      .filter(([, actions]) => actions.has('view'))
      .map(([slug]) => slug);

    if (visibleSlugs.length === 0) return [];

    const modules = await this.moduleRepo
      .createQueryBuilder('m')
      .where('m.is_active = true')
      .andWhere('m.slug IN (:...slugs)', { slugs: visibleSlugs })
      .orderBy('m.order_index', 'ASC')
      .getMany();

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

  // Módulos asignados individualmente al usuario
  async findByUser(userId: string) {
    const userAccess = await this.userAccessRepo.find({
      where: { user: { id: userId }, can_view: true },
      relations: ['module'],
      order: { module: { order_index: 'ASC' } },
    });
    return userAccess.map((ua) => ({
      ...ua.module,
      can_create: ua.can_create,
      can_edit:   ua.can_edit,
      can_delete: ua.can_delete,
      can_export: ua.can_export,
    }));
  }

  // Para el sidebar — si el usuario tiene accesos propios los usa, si no usa los del rol
  async findMyModules(roles: string[], userId: string) {
    if (roles.includes('admin')) return this.findAll();

    const userAccessCount = await this.userAccessRepo.count({
      where: { user: { id: userId }, can_view: true },
    });

    if (userAccessCount > 0) return this.findByUser(userId);

    // Fallback: permisos del rol
    const results = await Promise.all(roles.map((r) => this.findByRole(r)));
    const map = new Map<string, any>();
    for (const mod of results.flat()) {
      if (!map.has(mod.slug)) {
        map.set(mod.slug, { ...mod });
      } else {
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

  // ── Gestión de accesos por usuario ────────────────────────────

  async getUserModuleAccess(userId: string) {
    const records = await this.userAccessRepo.find({
      where: { user: { id: userId } },
      relations: ['module'],
      order: { module: { order_index: 'ASC' } },
    });
    return records.map((ua) => ({
      id:         ua.id,
      module_id:  ua.module.id,
      slug:       ua.module.slug,
      name:       ua.module.name,
      can_view:   ua.can_view,
      can_create: ua.can_create,
      can_edit:   ua.can_edit,
      can_delete: ua.can_delete,
      can_export: ua.can_export,
    }));
  }

  // Reemplaza todos los accesos del usuario de forma atómica
  async setUserModuleAccess(
    userId: string,
    accesses: {
      module_slug: string;
      can_create?: boolean;
      can_edit?:   boolean;
      can_delete?: boolean;
      can_export?: boolean;
    }[],
    createdBy: any,
  ) {
    await this.userAccessRepo.delete({ user: { id: userId } });

    if (accesses.length === 0) return { assigned: 0 };

    const modules = await this.moduleRepo.find({ where: { is_active: true } });
    const moduleMap = new Map(modules.map((m) => [m.slug, m]));

    const entries = accesses
      .filter((a) => moduleMap.has(a.module_slug))
      .map((a) => ({
        user:       { id: userId },
        module:     moduleMap.get(a.module_slug),
        can_view:   true,
        can_create: a.can_create ?? false,
        can_edit:   a.can_edit   ?? false,
        can_delete: a.can_delete ?? false,
        can_export: a.can_export ?? false,
        created_by: { id: createdBy.id },
      }));

    await this.userAccessRepo.save(entries);
    return { assigned: entries.length };
  }

  // Asigna o actualiza el acceso a un módulo individual (upsert)
  async assignSingleModule(
    userId: string,
    moduleSlug: string,
    permissions: {
      can_create?: boolean;
      can_edit?:   boolean;
      can_delete?: boolean;
      can_export?: boolean;
    },
    createdBy: any,
  ) {
    const module = await this.moduleRepo.findOne({
      where: { slug: moduleSlug, is_active: true },
    });
    if (!module) return { message: `Módulo '${moduleSlug}' no encontrado.` };

    const existing = await this.userAccessRepo.findOne({
      where: { user: { id: userId }, module: { id: module.id } },
    });

    if (existing) {
      await this.userAccessRepo.update(existing.id, {
        can_view:   true,
        can_create: permissions.can_create ?? existing.can_create,
        can_edit:   permissions.can_edit   ?? existing.can_edit,
        can_delete: permissions.can_delete ?? existing.can_delete,
        can_export: permissions.can_export ?? existing.can_export,
      });
    } else {
      await this.userAccessRepo.save({
        user:       { id: userId },
        module,
        can_view:   true,
        can_create: permissions.can_create ?? false,
        can_edit:   permissions.can_edit   ?? false,
        can_delete: permissions.can_delete ?? false,
        can_export: permissions.can_export ?? false,
        created_by: { id: createdBy.id },
      });
    }

    return { module: moduleSlug, assigned: true };
  }

  // Revoca el acceso a un módulo individual
  // Si era el último, el usuario vuelve automáticamente a los permisos del rol
  async revokeSingleModule(userId: string, moduleSlug: string) {
    const module = await this.moduleRepo.findOne({
      where: { slug: moduleSlug },
    });
    if (!module) return { message: `Módulo '${moduleSlug}' no encontrado.` };

    await this.userAccessRepo.delete({
      user:   { id: userId },
      module: { id: module.id },
    });

    const remaining = await this.userAccessRepo.count({
      where: { user: { id: userId }, can_view: true },
    });

    return {
      module:    moduleSlug,
      revoked:   true,
      fallback_to_role: remaining === 0,
    };
  }

  // Limpiar accesos individuales → vuelve a usar los del rol
  async clearUserModuleAccess(userId: string) {
    await this.userAccessRepo.delete({ user: { id: userId } });
    return { message: 'Accesos individuales eliminados. Se usarán los del rol.' };
  }
}