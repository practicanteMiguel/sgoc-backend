import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AppModule } from './entities/module.entity';
import { RoleModuleAccess } from './entities/role-module-access.entity';

@Injectable()
export class ModulesService {
  constructor(
    @InjectRepository(AppModule) private moduleRepo: Repository<AppModule>,
    @InjectRepository(RoleModuleAccess) private accessRepo: Repository<RoleModuleAccess>,
  ) {}

  findAll() {
    return this.moduleRepo.find({
      where: { is_active: true },
      order: { order_index: 'ASC' },
    });
  }

  // Devuelve los módulos que puede ver un rol específico
  async findByRole(roleSlug: string) {
    const access = await this.accessRepo.find({
      where: { role: { slug: roleSlug }, can_view: true },
      relations: ['module'],
      order: { module: { order_index: 'ASC' } },
    });
    return access.map(a => ({
      ...a.module,
      can_create: a.can_create,
      can_edit: a.can_edit,
      can_delete: a.can_delete,
      can_export: a.can_export,
    }));
  }

  // Para el sidebar del usuario autenticado
  async findMyModules(roles: string[]) {
    if (roles.includes('admin')) return this.findAll();

    const results = await Promise.all(roles.map(r => this.findByRole(r)));
    // Deduplicar por slug
    const map = new Map();
    results.flat().forEach(m => map.set(m.slug, m));
    return [...map.values()];
  }
}