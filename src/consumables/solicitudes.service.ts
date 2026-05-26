import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Not, Repository } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { Solicitud, EstadoSolicitud } from './entities/solicitud.entity';
import { SolicitudItem } from './entities/solicitud-item.entity';
import { SolicitudAdicional } from './entities/solicitud-adicional.entity';
import { Insumo } from './entities/insumo.entity';
import { Requisicion, EstadoRequisicion } from './entities/requisicion.entity';
import { RequisicionItem } from './entities/requisicion-item.entity';
import { RequisicionItemAdicional } from './entities/requisicion-item-adicional.entity';
import { Field } from '../plants/fields/entities/field.entity';
import { FieldLugar } from '../plants/fields/entities/field-lugar.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationPriority } from '../notifications/entities/enum/notification-priority.enum';
import {
  CrearSolicitudesDto, LlenadoSolicitudDto, GenerarRqsDto,
  CrearAdicionalDto, UpdateAdicionalDto, CrearSolicitudAdicionalDto,
} from './dto/create-solicitud.dto';

function presupuestoDe(s: { field_lugar_id: string | null; field_lugar?: { presupuesto: number | null } | null; field?: { presupuesto: number | null } | null }): number | null {
  if (s.field_lugar_id) {
    return s.field_lugar?.presupuesto != null ? Number(s.field_lugar.presupuesto) : null;
  }
  return s.field?.presupuesto != null ? Number(s.field.presupuesto) : null;
}

const MESES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

@Injectable()
export class SolicitudesService {
  constructor(
    @InjectRepository(Solicitud) private solicitudRepo: Repository<Solicitud>,
    @InjectRepository(SolicitudItem) private itemRepo: Repository<SolicitudItem>,
    @InjectRepository(SolicitudAdicional) private adicionalRepo: Repository<SolicitudAdicional>,
    @InjectRepository(Insumo) private insumoRepo: Repository<Insumo>,
    @InjectRepository(Requisicion) private rqRepo: Repository<Requisicion>,
    @InjectRepository(RequisicionItem) private rqItemRepo: Repository<RequisicionItem>,
    @InjectRepository(RequisicionItemAdicional) private rqAdicionalRepo: Repository<RequisicionItemAdicional>,
    @InjectRepository(Field)      private fieldRepo:      Repository<Field>,
    @InjectRepository(FieldLugar) private fieldLugarRepo:  Repository<FieldLugar>,
    @InjectRepository(User)       private userRepo:        Repository<User>,
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

  async findAll(mes: number, anio: number, fieldId?: string) {
    const solicitudes = await this.solicitudRepo.find({
      where: { mes, anio, ...(fieldId ? { field_id: fieldId } : {}) },
      relations: ['field', 'field_lugar'],
      order: { lugar: 'ASC' },
    });

    return solicitudes.map(s => ({
      id: s.id,
      mes: s.mes,
      anio: s.anio,
      field_id: s.field_id,
      field_lugar_id: s.field_lugar_id,
      lugar: s.lugar,
      lote: s.lote,
      estado: s.estado,
      fecha: s.fecha,
      nombre_solicitante: s.nombre_solicitante,
      presupuesto: presupuestoDe(s),
      firmado_supervisor: !!s.firma_supervisor_url,
      firma_supervisor_url: s.firma_supervisor_url,
      created_at: s.created_at,
    }));
  }

  async findOne(id: string) {
    const s = await this.solicitudRepo.findOne({
      where: { id },
      relations: ['items', 'items.insumo', 'field', 'field_lugar'],
    });
    if (!s) throw new NotFoundException('Solicitud no encontrada');

    const adicionales = await this.adicionalRepo.find({
      where: { solicitud_id: id },
      order: { created_at: 'ASC' },
    });

    const porCategoria: Record<string, typeof s.items> = {};
    for (const item of s.items) {
      const cat = item.insumo.categoria;
      if (!porCategoria[cat]) porCategoria[cat] = [];
      porCategoria[cat].push(item);
    }

    const adicionalesPorCategoria: Record<string, typeof adicionales> = {};
    for (const a of adicionales) {
      if (!adicionalesPorCategoria[a.categoria]) adicionalesPorCategoria[a.categoria] = [];
      adicionalesPorCategoria[a.categoria].push(a);
    }

    const todasCategorias = new Set([
      ...Object.keys(porCategoria),
      ...Object.keys(adicionalesPorCategoria),
    ]);

    const categorias = Array.from(todasCategorias).sort().map(categoria => {
      const templateItems = porCategoria[categoria] ?? [];
      const adicionalItems = adicionalesPorCategoria[categoria] ?? [];

      const subtotal =
        templateItems.reduce((sum, item) => {
          if (item.solicitado !== null && item.insumo.valor_unitario !== null)
            return sum + Number(item.solicitado) * Number(item.insumo.valor_unitario);
          return sum;
        }, 0) +
        adicionalItems.reduce((sum, a) => {
          if (a.solicitado !== null && a.valor_unitario !== null)
            return sum + Number(a.solicitado) * Number(a.valor_unitario);
          return sum;
        }, 0);

      return {
        categoria,
        subtotal,
        items: [
          ...templateItems.map(item => ({
            id: item.id,
            es_adicional: false,
            insumo_id: item.insumo_id,
            codigo: item.insumo.codigo,
            descripcion: item.insumo.descripcion,
            unidad: item.insumo.unidad,
            valor_unitario: item.insumo.valor_unitario,
            proveedor: null as string | null,
            solicitado: item.solicitado,
            total:
              item.solicitado !== null && item.insumo.valor_unitario !== null
                ? Number(item.solicitado) * Number(item.insumo.valor_unitario)
                : null,
          })),
          ...adicionalItems.map(a => ({
            id: a.id,
            es_adicional: true,
            insumo_id: null as string | null,
            codigo: 'ADC' as string | null,
            descripcion: a.descripcion,
            unidad: a.unidad,
            valor_unitario: a.valor_unitario,
            proveedor: a.proveedor,
            solicitado: a.solicitado,
            total:
              a.solicitado !== null && a.valor_unitario !== null
                ? Number(a.solicitado) * Number(a.valor_unitario)
                : null,
          })),
        ],
      };
    });

    const total_general = categorias.reduce((sum, c) => sum + c.subtotal, 0);

    const presupuesto = presupuestoDe(s);

    return {
      id: s.id,
      mes: s.mes,
      anio: s.anio,
      lugar: s.lugar,
      lote: s.lote,
      field_id: s.field_id,
      field_lugar_id: s.field_lugar_id,
      fecha: s.fecha,
      nombre_solicitante: s.nombre_solicitante,
      numero_contrato: s.numero_contrato,
      estado: s.estado,
      firmado_supervisor: !!s.firma_supervisor_url,
      firma_supervisor_url: s.firma_supervisor_url,
      presupuesto,
      excede_presupuesto: presupuesto !== null ? total_general > presupuesto : null,
      total_general,
      categorias,
      created_at: s.created_at,
      updated_at: s.updated_at,
    };
  }

  async llenado(id: string, dto: LlenadoSolicitudDto, userId: string) {
    const s = await this.solicitudRepo.findOne({ where: { id } });
    if (!s) throw new NotFoundException('Solicitud no encontrada');

    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user?.firma_url) throw new BadRequestException('Debes subir tu firma antes de enviar la solicitud');

    Object.assign(s, {
      fecha: dto.fecha,
      nombre_solicitante: dto.nombre_solicitante,
      numero_contrato: dto.numero_contrato,
      estado: EstadoSolicitud.COMPLETADA,
      firma_supervisor_url: user.firma_url,
    });
    await this.solicitudRepo.save(s);

    for (const itemDto of dto.items) {
      await this.itemRepo.update(itemDto.id, { solicitado: itemDto.solicitado });
    }

    return this.findOne(id);
  }

  async reabrir(id: string) {
    const s = await this.solicitudRepo.findOne({ where: { id } });
    if (!s) throw new NotFoundException('Solicitud no encontrada');
    s.estado = EstadoSolicitud.PENDIENTE;
    await this.solicitudRepo.save(s);
    return { id: s.id, estado: s.estado };
  }

  async addAdicional(solicitudId: string, dto: CrearAdicionalDto) {
    const s = await this.solicitudRepo.findOne({ where: { id: solicitudId } });
    if (!s) throw new NotFoundException('Solicitud no encontrada');
    return this.adicionalRepo.save(
      this.adicionalRepo.create({ ...dto, solicitud_id: solicitudId }),
    );
  }

  async updateAdicional(solicitudId: string, adicionalId: string, dto: UpdateAdicionalDto) {
    const a = await this.adicionalRepo.findOne({
      where: { id: adicionalId, solicitud_id: solicitudId },
    });
    if (!a) throw new NotFoundException('Adicional no encontrado');
    Object.assign(a, dto);
    return this.adicionalRepo.save(a);
  }

  async removeAdicional(solicitudId: string, adicionalId: string) {
    const a = await this.adicionalRepo.findOne({
      where: { id: adicionalId, solicitud_id: solicitudId },
    });
    if (!a) throw new NotFoundException('Adicional no encontrado');
    await this.adicionalRepo.remove(a);
    return { message: 'Adicional eliminado' };
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
      firmado_supervisor: !!rq.firma_supervisor_url,
      firmado_encargado: !!rq.firma_encargado_url,
      firma_supervisor_url: rq.firma_supervisor_url,
      firma_encargado_url: rq.firma_encargado_url,
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

  async findMisSolicitudes(userId: string, mes: number, anio: number) {
    const field = await this.fieldRepo.findOne({
      where: { supervisor: { id: userId } },
    });
    if (!field) throw new NotFoundException('No tienes una planta asignada como supervisor');

    const solicitudes = await this.solicitudRepo.find({
      where: { field_id: field.id, mes, anio },
      relations: ['field', 'field_lugar'],
      order: { created_at: 'ASC' },
    });

    return solicitudes.map(s => ({
      id: s.id,
      mes: s.mes,
      anio: s.anio,
      field_lugar_id: s.field_lugar_id,
      lugar: s.lugar,
      lote: s.lote,
      estado: s.estado,
      fecha: s.fecha,
      nombre_solicitante: s.nombre_solicitante,
      presupuesto: presupuestoDe(s),
      created_at: s.created_at,
    }));
  }

  async crearAdicional(userId: string, dto: CrearSolicitudAdicionalDto) {
    const field = await this.fieldRepo.findOne({
      where: { supervisor: { id: userId } },
    });
    if (!field) throw new NotFoundException('No tienes una planta asignada como supervisor');

    let lugar: string;
    let field_lugar_id: string | null = null;
    let lote = 45;

    if (dto.field_lugar_id) {
      const fieldLugar = await this.fieldLugarRepo.findOne({
        where: { id: dto.field_lugar_id, field_id: field.id },
      });
      if (!fieldLugar) throw new NotFoundException('Lugar no encontrado en tu planta');
      lugar = fieldLugar.nombre;
      field_lugar_id = fieldLugar.id;
      lote = fieldLugar.lote;
    } else if (dto.lugar) {
      lugar = dto.lugar;
    } else {
      throw new BadRequestException('Debes proveer field_lugar_id o lugar');
    }

    const insumos = await this.insumoRepo.find({
      where: { activo: true },
      order: { categoria: 'ASC', codigo: 'ASC' },
    });

    const solicitud = await this.solicitudRepo.save(
      this.solicitudRepo.create({
        mes: dto.mes,
        anio: dto.anio,
        field_id: field.id,
        field_lugar_id,
        lugar,
        lote,
      }),
    );

    const items = insumos.map(insumo =>
      this.itemRepo.create({ solicitud_id: solicitud.id, insumo_id: insumo.id, solicitado: null }),
    );
    await this.itemRepo.save(items);

    return this.findOne(solicitud.id);
  }

  async generarRqs(dto: GenerarRqsDto, userId: string) {
    const encargado = await this.userRepo.findOne({ where: { id: userId } });
    if (!encargado?.firma_url) throw new BadRequestException('Debes subir tu firma antes de generar las RQs');

    const s = await this.solicitudRepo.findOne({
      where: { id: dto.solicitud_id },
      relations: ['items', 'items.insumo'],
    });
    if (!s) throw new NotFoundException('Solicitud no encontrada');

    if (dto.ajustes?.length) {
      const itemMap = new Map(s.items.map(i => [i.id, i.insumo.codigo]));

      for (const ajuste of dto.ajustes) {
        await this.itemRepo.update(ajuste.item_id, { solicitado: ajuste.solicitado_nuevo });
        const item = s.items.find(i => i.id === ajuste.item_id);
        if (item) item.solicitado = ajuste.solicitado_nuevo;
      }

      if (s.field_id) {
        const field = await this.fieldRepo.findOne({
          where: { id: s.field_id },
          relations: ['supervisor'],
        });
        if (field?.supervisor) {
          const nombreMes = MESES[s.mes - 1];
          const cambios = dto.ajustes
            .map(a => `${itemMap.get(a.item_id) ?? a.item_id} de ${a.solicitado_original} → ${a.solicitado_nuevo}`)
            .join(', ');
          await this.notificationsService.createSystem({
            user_id: field.supervisor.id,
            title: 'Ajuste de cantidades en tu solicitud',
            message: `El encargado ajustó las cantidades de tu solicitud de ${nombreMes} ${s.anio}: ${cambios}.`,
            priority: NotificationPriority.HIGH,
            data: { solicitud_id: s.id },
          });
        }
      }
    }

    const adicionales = await this.adicionalRepo.find({
      where: { solicitud_id: s.id },
    });

    const numerosUsados = await Promise.all(
      dto.asignaciones.map(a => this.rqRepo.findOne({ where: { numero_rq: a.numero_rq } })),
    );
    const conflictos = dto.asignaciones
      .filter((_, i) => numerosUsados[i] !== null)
      .map(a => a.numero_rq);
    if (conflictos.length) {
      throw new ConflictException(
        `Los siguientes números de RQ ya fueron usados: ${conflictos.join(', ')}`,
      );
    }

    const resultado: Array<{ id: string; numero_rq: number; categoria: string; lugar: string }> = [];

    for (const asignacion of dto.asignaciones) {
      const itemsCategoria = s.items.filter(
        item => item.insumo.categoria === asignacion.categoria && Number(item.solicitado) > 0,
      );
      const adicionalesCategoria = adicionales.filter(
        a => a.categoria === asignacion.categoria && Number(a.solicitado) > 0,
      );

      if (!itemsCategoria.length && !adicionalesCategoria.length) continue;

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
          firma_supervisor_url: s.firma_supervisor_url,
          firma_encargado_url: encargado.firma_url,
        }),
      );

      const rqItems = itemsCategoria.map(item =>
        this.rqItemRepo.create({
          requisicion_id: rq.id,
          insumo_id: item.insumo_id,
          solicitado: item.solicitado,
        }),
      );
      if (rqItems.length) await this.rqItemRepo.save(rqItems);

      const rqAdicionales = adicionalesCategoria.map(a =>
        this.rqAdicionalRepo.create({
          requisicion_id: rq.id,
          categoria: a.categoria,
          descripcion: a.descripcion,
          unidad: a.unidad,
          valor_unitario: a.valor_unitario,
          proveedor: a.proveedor,
          solicitado: a.solicitado,
        }),
      );
      if (rqAdicionales.length) await this.rqAdicionalRepo.save(rqAdicionales);

      resultado.push({ id: rq.id, numero_rq: rq.numero_rq, categoria: rq.categoria, lugar: rq.lugar! });
    }

    if (resultado.length > 0) {
      await this.solicitudRepo.update(s.id, { estado: EstadoSolicitud.GENERADA });
    }

    return { created: resultado.length, requisiciones: resultado, estado: EstadoSolicitud.GENERADA };
  }
}
