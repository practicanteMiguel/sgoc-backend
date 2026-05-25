import {
  Injectable, NotFoundException, BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Field } from './entities/field.entity';
import { FieldLugar } from './entities/field-lugar.entity';
import { User } from '../../users/entities/user.entity';
import { Solicitud, EstadoSolicitud } from '../../consumables/entities/solicitud.entity';
import { CreateFieldDto } from './dto/create-field.dto';
import { UpdateFieldDto } from './dto/update-field.dto';
import { CreateFieldLugarDto } from './dto/create-field-lugar.dto';

const pickCreator = (u: any) => u
  ? { id: u.id, first_name: u.first_name, last_name: u.last_name, email: u.email, position: u.position }
  : null;

@Injectable()
export class FieldsService {
  constructor(
    @InjectRepository(Field)      private fieldRepo:      Repository<Field>,
    @InjectRepository(FieldLugar) private lugarRepo:      Repository<FieldLugar>,
    @InjectRepository(User)       private userRepo:       Repository<User>,
    @InjectRepository(Solicitud)  private solicitudRepo:  Repository<Solicitud>,
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

  private async getEntity(id: string): Promise<Field> {
    const field = await this.fieldRepo.findOne({
      where: { id },
      relations: ['supervisor', 'employees', 'created_by'],
    });
    if (!field) throw new NotFoundException('Planta no encontrada');
    return field;
  }

  async findOne(id: string) {
    const field = await this.getEntity(id);
    return { ...field, created_by: pickCreator(field.created_by) };
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
    const field = await this.getEntity(id);
    Object.assign(field, dto);
    return this.fieldRepo.save(field);
  }

  async remove(id: string) {
    await this.getEntity(id);
    await this.fieldRepo.softDelete(id);
    return { message: 'Planta eliminada correctamente' };
  }

  async assignSupervisor(fieldId: string, userId: string) {
    const field = await this.getEntity(fieldId);
    const user  = await this.userRepo.findOne({
      where: { id: userId },
      relations: ['user_roles', 'user_roles.role'],
    });
    if (!user) throw new NotFoundException('Usuario no encontrado');

    const isSupervisor = user.user_roles?.some(ur => ur.role.slug === 'supervisor');
    if (!isSupervisor)
      throw new BadRequestException('El usuario no tiene rol de supervisor');

    if (user.field_id && user.field_id !== fieldId) {
      const prevField = await this.fieldRepo.findOne({ where: { id: user.field_id } });
      if (prevField) {
        prevField.supervisor = null as any;
        await this.fieldRepo.save(prevField);
      }
    }

    field.supervisor = user;
    await this.fieldRepo.save(field);

    await this.userRepo.update(userId, { field_id: fieldId });

    return { message: `Supervisor asignado a la planta ${field.name}` };
  }

  async findLugares(fieldId: string) {
    await this.getEntity(fieldId);
    return this.lugarRepo.find({ where: { field_id: fieldId }, order: { nombre: 'ASC' } });
  }

  async createLugar(fieldId: string, dto: CreateFieldLugarDto) {
    await this.getEntity(fieldId);
    return this.lugarRepo.save(
      this.lugarRepo.create({ field_id: fieldId, nombre: dto.nombre, presupuesto: dto.presupuesto ?? null }),
    );
  }

  async setLugarPresupuesto(fieldId: string, lugarId: string, presupuesto: number | null) {
    const lugar = await this.lugarRepo.findOne({ where: { id: lugarId, field_id: fieldId } });
    if (!lugar) throw new NotFoundException('Lugar no encontrado');
    lugar.presupuesto = presupuesto;
    await this.lugarRepo.save(lugar);
    return { id: lugar.id, nombre: lugar.nombre, presupuesto: lugar.presupuesto };
  }

  async removeLugar(fieldId: string, lugarId: string) {
    const lugar = await this.lugarRepo.findOne({ where: { id: lugarId, field_id: fieldId } });
    if (!lugar) throw new NotFoundException('Lugar no encontrado');

    // Eliminar solicitudes PENDIENTES vinculadas a este lugar (las completadas se conservan)
    await this.solicitudRepo.delete({
      field_lugar_id: lugarId,
      estado: EstadoSolicitud.PENDIENTE,
    });

    await this.lugarRepo.remove(lugar);
    return { message: 'Lugar eliminado' };
  }

  async setPresupuesto(fieldId: string, presupuesto: number | null) {
    const field = await this.fieldRepo.findOne({ where: { id: fieldId } });
    if (!field) throw new NotFoundException('Planta no encontrada');
    field.presupuesto = presupuesto;
    await this.fieldRepo.save(field);
    return { id: field.id, name: field.name, presupuesto: field.presupuesto };
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
