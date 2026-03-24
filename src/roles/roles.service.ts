import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Role } from './entities/role.entity';
import { Permission } from './entities/permission.entity';
import { RolePermission } from './entities/role-permission.entity';
import { User } from '../users/entities/user.entity';

@Injectable()
export class RolesService {
  constructor(
    @InjectRepository(Role) private roleRepo: Repository<Role>,
    @InjectRepository(Permission) private permRepo: Repository<Permission>,
    @InjectRepository(RolePermission)
    private rpRepo: Repository<RolePermission>,
  ) {}

  async addPermissions(
    roleId: string,
    permissionSlugs: string[],
    creator: User,
  ) {
    const role = await this.roleRepo.findOne({ where: { id: roleId } });
    if (!role) throw new NotFoundException('Rol no encontrado');

    const perms = await this.permRepo.find({
      where: { slug: In(permissionSlugs) },
    });

    if (perms.length === 0) {
      throw new NotFoundException(
        'Permisos no encontrados con los lugs indicados',
      );
    }
    let added = 0;
    let skipped = 0;

    for (const perm of perms) {
      const exists = await this.rpRepo.findOne({
        where: { role: { id: role.id }, permission: { id: perm.id } },
      });
      if (!exists) {
        await this.rpRepo.save({ role, permission: perm, created_by: creator });
        added += 1;
      } else {
        skipped += 1;
      }
    }

    const foundSlugs = perms.map((p) => p.slug);
    const notFound = permissionSlugs.filter((s) => !foundSlugs.includes(s));
    return {
      message: `${added} permisos agregado(s) al rol ${role.name}`,
      added,
      skipped,
      notFound: notFound,
    };
  }

  findAll() {
    return this.roleRepo.find({
      relations: ['role_permissions', 'role_permissions.permission'],
      order: { created_at: 'ASC' },
    });
  }

  findAllPermissions() {
    return this.permRepo.find({ order: { module: 'ASC', action: 'ASC' } });
  }

  async getRolePermissions(roleId: string) {
    const role = await this.roleRepo.findOne({
      where: { id: roleId },
      relations: ['role_permissions', 'role_permissions.permission'],
    });
    if (!role) throw new NotFoundException('Rol no encontrado');
    return {
      role: {
        id: role.id,
        name: role.name,
        slug: role.slug,
      },
      permissions: role.role_permissions.map((rp) => ({
        id: rp.permission.id,
        name: rp.permission.name,
        slug: rp.permission.slug,
        module: rp.permission.module,
        action: rp.permission.action,
      })),
      total: role.role_permissions.length,
    };
  }

  async create(
    dto: { name: string; slug: string; description?: string },
    creator: User,
  ) {
    const exists = await this.roleRepo.findOne({ where: { slug: dto.slug } });
    if (exists) throw new ConflictException('El slug ya existe');
    return this.roleRepo.save({ ...dto, created_by: creator });
  }

  async update(
    id: string,
    dto: Partial<{ name: string; description: string; is_active: boolean }>,
  ) {
    const role = await this.roleRepo.findOne({ where: { id } });
    if (!role) throw new NotFoundException('Rol no encontrado');
    await this.roleRepo.save({ ...role, ...dto });
    return this.roleRepo.findOne({ where: { id } });
  }

  async remove(id: string) {
    const role = await this.roleRepo.findOne({ where: { id } });
    if (!role) throw new NotFoundException('Rol no encontrado');
    if (role.is_system)
      throw new BadRequestException('No se puede eliminar un rol del sistema');
    await this.roleRepo.remove(role);
    return { message: 'Rol eliminado' };
  }

  async assignPermissions(
    roleId: string,
    permissionSlugs: string[],
    creator: User,
  ) {
    const role = await this.roleRepo.findOne({ where: { id: roleId } });
    if (!role) throw new NotFoundException('Rol no encontrado');

    // Eliminar permisos actuales y reasignar
    await this.rpRepo.delete({ role: { id: roleId } });

    const perms = await this.permRepo.find({
      where: permissionSlugs.map((slug) => ({ slug })),
    });

    const entries = perms.map((p) => ({
      role,
      permission: p,
      created_by: creator,
    }));
    await this.rpRepo.save(entries);
    return { assigned: perms.length };
  }

  async removePermissions(roleId: string, permissionSlugs: string[]) {
    const role = await this.roleRepo.findOne({ where: { id: roleId } });
    if (!role) throw new NotFoundException('Rol no encontrado');

    const perms = await this.permRepo.find({
      where: { slug: In(permissionSlugs) },
    });

    if (perms.length === 0) {
      throw new BadRequestException(
        'Ningún permiso encontrado con los slugs indicados',
      );
    }

    const permIds = perms.map((p) => p.id);
    const rpsToRemove = await this.rpRepo
      .createQueryBuilder('rp')
      .where('rp.role_id = :roleId', { roleId })
      .andWhere('rp.permission_id IN (:...permIds)', { permIds })
      .getMany();

    const removed = rpsToRemove.length;
    const notHad = perms.length - removed;

    if (removed > 0) {
      await this.rpRepo.remove(rpsToRemove);
    }

    const foundSlugs = perms.map((p) => p.slug);
    const notFound = permissionSlugs.filter((s) => !foundSlugs.includes(s));

    return {
      message: `${removed} permiso(s) quitado(s) del rol ${role.name}`,
      removed,
      not_had: notHad,
      not_found: notFound,
    };
  }
}
