import {
  Injectable, NotFoundException, ConflictException, BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Role } from './entities/role.entity';
import { Permission } from './entities/permission.entity';
import { RolePermission } from './entities/role-permission.entity';
import { User } from '../users/entities/user.entity';

@Injectable()
export class RolesService {
  constructor(
    @InjectRepository(Role) private roleRepo: Repository<Role>,
    @InjectRepository(Permission) private permRepo: Repository<Permission>,
    @InjectRepository(RolePermission) private rpRepo: Repository<RolePermission>,
  ) {}

  findAll() {
    return this.roleRepo.find({
      relations: ['role_permissions', 'role_permissions.permission'],
      order: { created_at: 'ASC' },
    });
  }

  findAllPermissions() {
    return this.permRepo.find({ order: { module: 'ASC', action: 'ASC' } });
  }

  async create(dto: { name: string; slug: string; description?: string }, creator: User) {
    const exists = await this.roleRepo.findOne({ where: { slug: dto.slug } });
    if (exists) throw new ConflictException('El slug ya existe');
    return this.roleRepo.save({ ...dto, created_by: creator });
  }

  async update(id: string, dto: Partial<{ name: string; description: string; is_active: boolean }>) {
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

  async assignPermissions(roleId: string, permissionSlugs: string[], creator: User) {
    const role = await this.roleRepo.findOne({ where: { id: roleId } });
    if (!role) throw new NotFoundException('Rol no encontrado');

    // Eliminar permisos actuales y reasignar
    await this.rpRepo.delete({ role: { id: roleId } });

    const perms = await this.permRepo.find({
      where: permissionSlugs.map(slug => ({ slug })),
    });

    const entries = perms.map(p => ({ role, permission: p, created_by: creator }));
    await this.rpRepo.save(entries);
    return { assigned: perms.length };
  }
}