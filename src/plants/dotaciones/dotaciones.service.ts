import {
  Injectable, NotFoundException, BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DotacionSpace } from './entities/dotacion-space.entity';
import { SolicitudDotacion } from './entities/solicitud-dotacion.entity';
import { ReposicionDotacion } from './entities/reposicion-dotacion.entity';
import { DotacionImagen } from './entities/dotacion-imagen.entity';
import { Employee } from '../employees/entities/employee.entity';
import { Field } from '../fields/entities/field.entity';
import { User } from '../../users/entities/user.entity';
import { CloudinaryService } from '../activities/cloudinary/cloudinary.service';
import { CreateSolicitudDotacionDto, UpdateEstadoDto } from './dto/create-solicitud.dto';
import { EstadoSolicitudDotacion } from './entities/solicitud-dotacion.entity';

function sanitize(v: string) {
  return v.trim().toLowerCase().replace(/\s+/g, '_').replace(/[^\w]/g, '');
}

@Injectable()
export class DotacionesService {
  constructor(
    @InjectRepository(DotacionSpace)      private spaceRepo:      Repository<DotacionSpace>,
    @InjectRepository(SolicitudDotacion)  private solicitudRepo:  Repository<SolicitudDotacion>,
    @InjectRepository(ReposicionDotacion) private reposicionRepo: Repository<ReposicionDotacion>,
    @InjectRepository(DotacionImagen)     private imagenRepo:     Repository<DotacionImagen>,
    @InjectRepository(Employee)           private employeeRepo:   Repository<Employee>,
    @InjectRepository(Field)              private fieldRepo:      Repository<Field>,
    private readonly cloudinary: CloudinaryService,
  ) {}

  async createOrGetSpace(user: User) {
    if (!user.field_id) {
      throw new BadRequestException('El supervisor no tiene un campo asignado');
    }

    const existing = await this.spaceRepo.findOne({
      where: { supervisor: { id: user.id } },
      relations: ['field', 'supervisor'],
    });
    if (existing) return existing;

    const field = await this.fieldRepo.findOne({ where: { id: user.field_id } });
    if (!field) throw new NotFoundException('Campo no encontrado');

    const space = this.spaceRepo.create({ field, supervisor: user });
    return this.spaceRepo.save(space);
  }

  async getMySpace(user: User) {
    const space = await this.spaceRepo.findOne({
      where: { supervisor: { id: user.id } },
      relations: ['field'],
    });
    if (!space) throw new NotFoundException('No tienes un espacio creado');
    return space;
  }

  async getByToken(token: string) {
    const space = await this.spaceRepo.findOne({
      where: { vault_token: token },
      relations: ['field'],
    });
    if (!space) throw new NotFoundException('Enlace no valido');
    return {
      space_id:    space.id,
      vault_token: space.vault_token,
      campo:       space.field.name,
      campo_id:    space.field.id,
    };
  }

  async createSolicitud(
    token: string,
    dto: CreateSolicitudDotacionDto,
    filesByIndex: Record<number, Express.Multer.File[]>,
  ) {
    const space = await this.spaceRepo.findOne({
      where: { vault_token: token },
      relations: ['field'],
    });
    if (!space) throw new NotFoundException('Enlace no valido');

    const solicitud = await this.solicitudRepo.save(
      this.solicitudRepo.create({
        space,
        campo:                   space.field,
        contrato:                dto.contrato,
        fecha:                   dto.fecha as any,
        inspeccion_realizada_por: dto.inspeccion_realizada_por,
        cargo_inspector:         dto.cargo_inspector,
      }),
    );

    const reposicionesResult: Array<ReposicionDotacion & { imagenes: DotacionImagen[] }> = [];

    for (let i = 0; i < dto.reposiciones.length; i++) {
      const r = dto.reposiciones[i];

      const empleado = await this.employeeRepo.findOne({ where: { id: r.empleado_id } });
      if (!empleado) throw new BadRequestException(`Empleado ${r.empleado_id} no encontrado`);

      const reposicion = await this.reposicionRepo.save(
        this.reposicionRepo.create({
          solicitud,
          empleado,
          condicion_encontrada: r.condicion_encontrada,
          fecha_entrega:        r.fecha_entrega ? (r.fecha_entrega as any) : null,
        }),
      );

      const imagenes: DotacionImagen[] = [];
      const archivos = filesByIndex[i] ?? [];

      if (archivos.length) {
        const folder = `dotaciones/${sanitize(space.field.name)}/${sanitize(`${empleado.first_name} ${empleado.last_name}`)}`;

        for (const file of archivos) {
          const { url, public_id } = await this.cloudinary.uploadFull(file, folder);
          imagenes.push(
            await this.imagenRepo.save(
              this.imagenRepo.create({ reposicion, url, public_id, original_name: file.originalname }),
            ),
          );
        }
      }

      reposicionesResult.push({ ...reposicion, imagenes });
    }

    return { ...solicitud, reposiciones: reposicionesResult };
  }

  async getEmpleadosByToken(token: string) {
    const space = await this.spaceRepo.findOne({
      where: { vault_token: token },
      relations: ['field'],
    });
    if (!space) throw new NotFoundException('Enlace no valido');

    return this.employeeRepo.find({
      where: { field: { id: space.field.id }, is_active: true },
      select: ['id', 'first_name', 'last_name', 'position', 'identification_number'],
      order: { first_name: 'ASC' },
    });
  }

  async getSolicitudes(token: string) {
    const space = await this.spaceRepo.findOne({ where: { vault_token: token } });
    if (!space) throw new NotFoundException('Enlace no valido');

    return this.solicitudRepo.find({
      where: { space: { id: space.id } },
      relations: ['campo', 'reposiciones', 'reposiciones.empleado', 'reposiciones.imagenes'],
      order: { created_at: 'DESC' },
    });
  }

  async getAllSolicitudes(estado?: EstadoSolicitudDotacion, campo_id?: string) {
    const where: Record<string, any> = {};
    if (estado)   where['estado'] = estado;
    if (campo_id) where['campo']  = { id: campo_id };

    return this.solicitudRepo.find({
      where,
      relations: ['campo', 'space', 'space.supervisor', 'reposiciones', 'reposiciones.empleado', 'reposiciones.imagenes'],
      order: { created_at: 'DESC' },
    });
  }

  async updateEstado(id: string, dto: UpdateEstadoDto) {
    const solicitud = await this.solicitudRepo.findOne({ where: { id } });
    if (!solicitud) throw new NotFoundException('Solicitud no encontrada');

    solicitud.estado = dto.estado;
    return this.solicitudRepo.save(solicitud);
  }
}
