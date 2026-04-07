import {
  Injectable, NotFoundException, BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Field } from './entities/field.entity';
import { User } from '../../users/entities/user.entity';
import { CreateFieldDto } from './dto/create-field.dto';
import { UpdateFieldDto } from './dto/update-field.dto';

@Injectable()
export class FieldsService {
  constructor(
    @InjectRepository(Field) private fieldRepo: Repository<Field>,
    @InjectRepository(User)  private userRepo: Repository<User>,
  ) {}

  async findAll(page = 1, limit = 20) {
    const [data, total] = await this.fieldRepo.findAndCount({
      relations: ['supervisor', 'employees'],
      withDeleted: false,
      skip: (page - 1) * limit,
      take: limit,
      order: { created_at: 'DESC' },
    });
    return { data, total, page, limit, pages: Math.ceil(total / limit) };
  }

  async findOne(id: string) {
    const field = await this.fieldRepo.findOne({
      where: { id },
      relations: ['supervisor', 'employees', 'created_by'],
    });
    if (!field) throw new NotFoundException('Planta no encontrada');
    return field;
  }

  async create(dto: CreateFieldDto, currentUser: User) {
    const field = this.fieldRepo.create({
      name:       dto.name,
      location:   dto.location,
      created_by: currentUser,
    });
    return this.fieldRepo.save(field);
  }

  async update(id: string, dto: UpdateFieldDto) {
    const field = await this.findOne(id);
    Object.assign(field, dto);
    return this.fieldRepo.save(field);
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.fieldRepo.softDelete(id);
    return { message: 'Planta eliminada correctamente' };
  }

  async assignSupervisor(fieldId: string, userId: string) {
    const field = await this.findOne(fieldId);
    const user  = await this.userRepo.findOne({
      where: { id: userId },
      relations: ['user_roles', 'user_roles.role'],
    });
    if (!user) throw new NotFoundException('Usuario no encontrado');

    const isSupervisor = user.user_roles?.some(ur => ur.role.slug === 'supervisor');
    if (!isSupervisor)
      throw new BadRequestException('El usuario no tiene rol de supervisor');

    // Si el usuario ya estaba asignado a otra planta, quitar esa relacion
    if (user.field_id && user.field_id !== fieldId) {
      const prevField = await this.fieldRepo.findOne({ where: { id: user.field_id } });
      if (prevField) {
        prevField.supervisor = null as any;
        await this.fieldRepo.save(prevField);
      }
    }

    field.supervisor = user;
    await this.fieldRepo.save(field);

    // Actualizar el campo field_id del usuario
    await this.userRepo.update(userId, { field_id: fieldId });

    return { message: `Supervisor asignado a la planta ${field.name}` };
  }

  async removeSupervisor(fieldId: string) {
    const field = await this.fieldRepo.findOne({
      where: { id: fieldId },
      relations: ['supervisor'],
    });
    if (!field) throw new NotFoundException('Planta no encontrada');
    if (!field.supervisor)
      throw new BadRequestException('La planta no tiene supervisor asignado');

    const supervisorId = field.supervisor.id;
    field.supervisor   = null as any;
    await this.fieldRepo.save(field);

    await this.userRepo.update(supervisorId, { field_id: null as any });

    return { message: 'Supervisor removido de la planta' };
  }
}
