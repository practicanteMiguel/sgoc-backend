import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Not, Repository } from 'typeorm';
import { Solicitud, EstadoSolicitud } from './entities/solicitud.entity';
import { SolicitudItem } from './entities/solicitud-item.entity';
import { Insumo } from './entities/insumo.entity';
import { Requisicion, EstadoRequisicion } from './entities/requisicion.entity';
import { RequisicionItem } from './entities/requisicion-item.entity';
import { Field } from '../plants/fields/entities/field.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationPriority } from '../notifications/entities/enum/notification-priority.enum';
import { CrearSolicitudesDto, LlenadoSolicitudDto, GenerarRqsDto } from './dto/create-solicitud.dto';

const MESES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

@Injectable()
export class SolicitudesService {
  constructor(
    @InjectRepository(Solicitud) private solicitudRepo: Repository<Solicitud>,
    @InjectRepository(SolicitudItem) private itemRepo: Repository<SolicitudItem>,
    @InjectRepository(Insumo) private insumoRepo: Repository<Insumo>,
    @InjectRepository(Requisicion) private rqRepo: Repository<Requisicion>,
    @InjectRepository(RequisicionItem) private rqItemRepo: Repository<RequisicionItem>,
    @InjectRepository(Field) private fieldRepo: Repository<Field>,
    private notificationsService: NotificationsService,
  ) {}

  async enviarAplantas(dto: CrearSolicitudesDto) {
    const fields = await this.fieldRepo.find({
      where: { supervisor: Not(IsNull()) },
      relations: ['supervisor'],
      withDeleted: false,
    });

    const insumos = await this.insumoRepo.find({
      where: { activo: true },
      order: { categoria: 'ASC', codigo: 'ASC' },
    });

    const nombreMes = MESES[dto.mes - 1];
    const resultado: Array<{ id: string; lugar: string; lote: number }> = [];

    for (const field of fields) {
      const solicitud = await this.solicitudRepo.save(
        this.solicitudRepo.create({
          mes: dto.mes,
          anio: dto.anio,
          field_id: field.id,
          lugar: field.name,
        }),
      );

      const items = insumos.map(insumo =>
        this.itemRepo.create({ solicitud_id: solicitud.id, insumo_id: insumo.id, solicitado: null }),
      );
      await this.itemRepo.save(items);

      if (field.supervisor) {
        await this.notificationsService.createSystem({
          user_id: field.supervisor.id,
          title: 'Formulario de consumibles disponible',
          message: `El formulario de consumibles de ${nombreMes} ${dto.anio} ya esta disponible para completar.`,
          priority: NotificationPriority.HIGH,
          data: { solicitud_id: solicitud.id },
        });
      }

      resultado.push({ id: solicitud.id, lugar: solicitud.lugar, lote: solicitud.lote });
    }

    return { enviadas: resultado.length, solicitudes: resultado };
  }

  async findAll(mes: number, anio: number) {
    const solicitudes = await this.solicitudRepo.find({
      where: { mes, anio },
      order: { lugar: 'ASC' },
    });

    return solicitudes.map(s => ({
      id: s.id,
      mes: s.mes,
      anio: s.anio,
      lugar: s.lugar,
      lote: s.lote,
      estado: s.estado,
      fecha: s.fecha,
      nombre_solicitante: s.nombre_solicitante,
      created_at: s.created_at,
    }));
  }

  async findOne(id: string) {
    const s = await this.solicitudRepo.findOne({
      where: { id },
      relations: ['items', 'items.insumo'],
    });
    if (!s) throw new NotFoundException('Solicitud no encontrada');

    const porCategoria: Record<string, typeof s.items> = {};
    for (const item of s.items) {
      const cat = item.insumo.categoria;
      if (!porCategoria[cat]) porCategoria[cat] = [];
      porCategoria[cat].push(item);
    }

    const categorias = Object.entries(porCategoria).map(([categoria, items]) => {
      const subtotal = items.reduce((sum, item) => {
        if (item.solicitado !== null && item.insumo.valor_unitario !== null)
          return sum + Number(item.solicitado) * Number(item.insumo.valor_unitario);
        return sum;
      }, 0);

      return {
        categoria,
        subtotal,
        items: items.map(item => ({
          id: item.id,
          insumo_id: item.insumo_id,
          codigo: item.insumo.codigo,
          descripcion: item.insumo.descripcion,
          unidad: item.insumo.unidad,
          valor_unitario: item.insumo.valor_unitario,
          solicitado: item.solicitado,
          total:
            item.solicitado !== null && item.insumo.valor_unitario !== null
              ? Number(item.solicitado) * Number(item.insumo.valor_unitario)
              : null,
        })),
      };
    });

    const total_general = categorias.reduce((sum, c) => sum + c.subtotal, 0);

    return {
      id: s.id,
      mes: s.mes,
      anio: s.anio,
      lugar: s.lugar,
      lote: s.lote,
      field_id: s.field_id,
      fecha: s.fecha,
      nombre_solicitante: s.nombre_solicitante,
      numero_contrato: s.numero_contrato,
      estado: s.estado,
      total_general,
      categorias,
      created_at: s.created_at,
      updated_at: s.updated_at,
    };
  }

  async llenado(id: string, dto: LlenadoSolicitudDto) {
    const s = await this.solicitudRepo.findOne({ where: { id } });
    if (!s) throw new NotFoundException('Solicitud no encontrada');

    Object.assign(s, {
      fecha: dto.fecha,
      nombre_solicitante: dto.nombre_solicitante,
      numero_contrato: dto.numero_contrato,
      estado: EstadoSolicitud.COMPLETADA,
    });
    await this.solicitudRepo.save(s);

    for (const itemDto of dto.items) {
      await this.itemRepo.update(itemDto.id, { solicitado: itemDto.solicitado });
    }

    return this.findOne(id);
  }

  async findRequisicionesBySolicitud(solicitudId: string) {
    const rqs = await this.rqRepo.find({
      where: { solicitud_id: solicitudId },
      order: { categoria: 'ASC' },
    });

    return rqs.map(rq => ({
      id: rq.id,
      numero_rq: rq.numero_rq,
      categoria: rq.categoria,
      estado: rq.estado,
      lugar: rq.lugar,
      created_at: rq.created_at,
    }));
  }

  async findMiSolicitud(userId: string, mes: number, anio: number) {
    const field = await this.fieldRepo.findOne({
      where: { supervisor: { id: userId } },
    });
    if (!field) throw new NotFoundException('No tienes una planta asignada como supervisor');

    const s = await this.solicitudRepo.findOne({
      where: { field_id: field.id, mes, anio },
    });
    if (!s) throw new NotFoundException('No hay solicitud para este periodo');

    return this.findOne(s.id);
  }

  async generarRqs(dto: GenerarRqsDto) {
    const s = await this.solicitudRepo.findOne({
      where: { id: dto.solicitud_id },
      relations: ['items', 'items.insumo'],
    });
    if (!s) throw new NotFoundException('Solicitud no encontrada');

    const resultado: Array<{ id: string; numero_rq: number; categoria: string; lugar: string }> = [];

    for (const asignacion of dto.asignaciones) {
      const itemsCategoria = s.items.filter(
        item => item.insumo.categoria === asignacion.categoria && Number(item.solicitado) > 0,
      );
      if (!itemsCategoria.length) continue;

      const rq = await this.rqRepo.save(
        this.rqRepo.create({
          numero_rq: asignacion.numero_rq,
          lote: s.lote,
          categoria: asignacion.categoria,
          lugar: s.lugar,
          field_id: s.field_id,
          solicitud_id: s.id,
          fecha: s.fecha,
          nombre_solicitante: s.nombre_solicitante,
          numero_contrato: s.numero_contrato,
          estado: EstadoRequisicion.APROBADA,
        }),
      );

      const rqItems = itemsCategoria.map(item =>
        this.rqItemRepo.create({
          requisicion_id: rq.id,
          insumo_id: item.insumo_id,
          solicitado: item.solicitado,
        }),
      );
      await this.rqItemRepo.save(rqItems);

      resultado.push({ id: rq.id, numero_rq: rq.numero_rq, categoria: rq.categoria, lugar: rq.lugar! });
    }

    return { created: resultado.length, requisiciones: resultado };
  }
}
