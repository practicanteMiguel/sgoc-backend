import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Not, Repository } from 'typeorm';
import { Requisicion, EstadoRequisicion } from './entities/requisicion.entity';
import { RequisicionItem } from './entities/requisicion-item.entity';
import { RequisicionItemAdicional } from './entities/requisicion-item-adicional.entity';
import { Insumo } from './entities/insumo.entity';
import { Field } from '../plants/fields/entities/field.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationPriority } from '../notifications/entities/enum/notification-priority.enum';
import {
  CreateRequisicionDto,
  UpdateRequisicionDto,
  LlenadoSupervisorDto,
  CreateRequisicionMasivoDto,
  UpdateEstadoDto,
  UpdateFacturasDto,
} from './dto/create-requisicion.dto';

const MESES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

@Injectable()
export class RequisicionesService {
  constructor(
    @InjectRepository(Requisicion) private rqRepo: Repository<Requisicion>,
    @InjectRepository(RequisicionItem) private itemRepo: Repository<RequisicionItem>,
    @InjectRepository(RequisicionItemAdicional) private rqAdicionalRepo: Repository<RequisicionItemAdicional>,
    @InjectRepository(Insumo) private insumoRepo: Repository<Insumo>,
    @InjectRepository(Field) private fieldRepo: Repository<Field>,
    private notificationsService: NotificationsService,
  ) {}

  private async assertNumeroUnico(numero: number) {
    const existe = await this.rqRepo.findOne({ where: { numero_rq: numero } });
    if (existe) {
      throw new ConflictException(`El número de RQ ${numero} ya fue usado en otra requisición`);
    }
  }

  async create(dto: CreateRequisicionDto) {
    await this.assertNumeroUnico(dto.numero_rq);
    const rq = this.rqRepo.create({
      numero_rq: dto.numero_rq,
      lote: dto.lote ?? 45,
      categoria: dto.categoria,
      lugar: dto.lugar ?? null,
    });
    const saved = await this.rqRepo.save(rq);

    const insumos = await this.insumoRepo.find({
      where: { categoria: dto.categoria, activo: true },
      order: { codigo: 'ASC' },
    });

    const items = insumos.map(insumo =>
      this.itemRepo.create({ requisicion_id: saved.id, insumo_id: insumo.id, solicitado: null }),
    );
    await this.itemRepo.save(items);

    return this.findOne(saved.id);
  }

  async crearMasivo(dto: CreateRequisicionMasivoDto) {
    await this.assertNumeroUnico(dto.numero_rq);
    const fields = await this.fieldRepo.find({
      where: { supervisor: Not(IsNull()) },
      relations: ['supervisor'],
      withDeleted: false,
    });

    const insumos = await this.insumoRepo.find({
      where: { categoria: dto.categoria, activo: true },
      order: { codigo: 'ASC' },
    });

    const mes = new Date().getMonth();
    const anio = new Date().getFullYear();
    const nombreMes = MESES[mes];
    const resultado: Array<{
      planta: string;
      supervisor: string;
      rq_id: string;
      numero_rq: number;
    }> = [];

    for (const field of fields) {
      const rq = await this.rqRepo.save(
        this.rqRepo.create({
          numero_rq: dto.numero_rq,
          lote: dto.lote ?? 45,
          categoria: dto.categoria,
          lugar: field.name,
          field_id: field.id,
        }),
      );

      const items = insumos.map(insumo =>
        this.itemRepo.create({ requisicion_id: rq.id, insumo_id: insumo.id, solicitado: null }),
      );
      await this.itemRepo.save(items);

      await this.notificationsService.createSystem({
        user_id: field.supervisor.id,
        title: 'Lista de consumibles disponible',
        message: `La lista de consumibles (${dto.categoria}) de ${nombreMes} ${anio} ya está disponible para llenarse.`,
        priority: NotificationPriority.HIGH,
        data: { rq_id: rq.id, categoria: dto.categoria },
      });

      resultado.push({
        planta: field.name,
        supervisor: `${field.supervisor.first_name} ${field.supervisor.last_name}`,
        rq_id: rq.id,
        numero_rq: rq.numero_rq,
      });
    }

    return resultado;
  }

  async findAll(mes?: number, anio?: number) {
    const qb = this.rqRepo
      .createQueryBuilder('r')
      .orderBy('r.created_at', 'DESC');

    if (mes !== undefined && anio !== undefined) {
      qb.leftJoin('solicitudes', 's', 's.id = r.solicitud_id')
        .where(
          '(r.solicitud_id IS NOT NULL AND s.mes = :mes AND s.anio = :anio) OR ' +
          '(r.solicitud_id IS NULL AND EXTRACT(MONTH FROM r.created_at) = :mes AND EXTRACT(YEAR FROM r.created_at) = :anio)',
          { mes, anio },
        );
    }

    const rqs = await qb.getMany();
    return rqs.map(r => ({ ...r, mes, anio }));
  }

  async informe(mes: number, anio: number) {
    const rqs = await this.rqRepo
      .createQueryBuilder('r')
      .leftJoinAndSelect('r.items', 'item')
      .leftJoinAndSelect('item.insumo', 'insumo')
      .leftJoin('solicitudes', 's', 's.id = r.solicitud_id')
      .where(
        '(r.solicitud_id IS NOT NULL AND s.mes = :mes AND s.anio = :anio) OR ' +
        '(r.solicitud_id IS NULL AND EXTRACT(MONTH FROM r.created_at) = :mes AND EXTRACT(YEAR FROM r.created_at) = :anio)',
        { mes, anio },
      )
      .orderBy('r.lugar', 'ASC')
      .addOrderBy('r.categoria', 'ASC')
      .addOrderBy('insumo.codigo', 'ASC')
      .getMany();

    const rqIds = rqs.map(r => r.id);
    const todosAdicionales = rqIds.length
      ? await this.rqAdicionalRepo
          .createQueryBuilder('a')
          .where('a.requisicion_id IN (:...ids)', { ids: rqIds })
          .getMany()
      : [];

    let total_estimado = 0;
    let total_real = 0;
    const rows: object[] = [];

    for (const rq of rqs) {
      for (const item of rq.items) {
        const estimado =
          item.solicitado !== null && item.insumo.valor_unitario !== null
            ? Number(item.solicitado) * Number(item.insumo.valor_unitario)
            : 0;
        const real =
          item.solicitado !== null && item.precio_real !== null
            ? Number(item.solicitado) * Number(item.precio_real)
            : 0;
        total_estimado += estimado;
        total_real += real;

        rows.push({
          rq_id: rq.id,
          numero_rq: rq.numero_rq,
          lugar: rq.lugar,
          lote: rq.lote,
          categoria: rq.categoria,
          es_adicional: false,
          item_id: item.id,
          insumo_id: item.insumo_id,
          codigo: item.insumo.codigo,
          descripcion: item.insumo.descripcion,
          unidad: item.insumo.unidad,
          proveedor_ordinario: item.insumo.proveedor_ordinario,
          solicitado: item.solicitado,
          valor_unitario: item.insumo.valor_unitario,
          numero_factura: item.numero_factura,
          precio_real: item.precio_real,
          proveedor_factura: item.proveedor_factura,
        });
      }

      for (const a of todosAdicionales.filter(x => x.requisicion_id === rq.id)) {
        const estimado =
          a.solicitado !== null && a.valor_unitario !== null
            ? Number(a.solicitado) * Number(a.valor_unitario)
            : 0;
        const real =
          a.solicitado !== null && a.precio_real !== null
            ? Number(a.solicitado) * Number(a.precio_real)
            : 0;
        total_estimado += estimado;
        total_real += real;

        rows.push({
          rq_id: rq.id,
          numero_rq: rq.numero_rq,
          lugar: rq.lugar,
          lote: rq.lote,
          categoria: rq.categoria,
          es_adicional: true,
          item_id: a.id,
          insumo_id: null,
          codigo: 'ADC',
          descripcion: a.descripcion,
          unidad: a.unidad,
          proveedor_ordinario: a.proveedor,
          solicitado: a.solicitado,
          valor_unitario: a.valor_unitario,
          numero_factura: a.numero_factura,
          precio_real: a.precio_real,
          proveedor_factura: a.proveedor_factura,
        });
      }
    }

    return { mes, anio, total_estimado, total_real, rows };
  }

  async findOne(id: string) {
    const rq = await this.rqRepo.findOne({
      where: { id },
      relations: ['items', 'items.insumo'],
    });
    if (!rq) throw new NotFoundException('Requisicion no encontrada');

    const adicionales = await this.rqAdicionalRepo.find({ where: { requisicion_id: id } });

    const itemsConTotal = rq.items.map(item => ({
      id: item.id,
      es_adicional: false,
      insumo_id: item.insumo_id,
      codigo: item.insumo.codigo,
      descripcion: item.insumo.descripcion,
      unidad: item.insumo.unidad,
      valor_unitario: item.insumo.valor_unitario,
      proveedor_ordinario: item.insumo.proveedor_ordinario,
      proveedor_extraordinario: item.insumo.proveedor_extraordinario,
      solicitado: item.solicitado,
      numero_factura: item.numero_factura,
      precio_real: item.precio_real,
      proveedor_factura: item.proveedor_factura,
      total:
        item.solicitado !== null && item.insumo.valor_unitario !== null
          ? Number(item.solicitado) * Number(item.insumo.valor_unitario)
          : null,
    }));

    const adicionalesConTotal = adicionales.map(a => ({
      id: a.id,
      es_adicional: true,
      insumo_id: null as string | null,
      codigo: 'ADC' as string | null,
      descripcion: a.descripcion,
      unidad: a.unidad,
      valor_unitario: a.valor_unitario,
      proveedor_ordinario: a.proveedor,
      proveedor_extraordinario: null as string | null,
      solicitado: a.solicitado,
      numero_factura: a.numero_factura,
      precio_real: a.precio_real,
      proveedor_factura: a.proveedor_factura,
      total:
        a.solicitado !== null && a.valor_unitario !== null
          ? Number(a.solicitado) * Number(a.valor_unitario)
          : null,
    }));

    const allItems = [...itemsConTotal, ...adicionalesConTotal];
    const total_general = allItems.reduce(
      (sum, i) => (i.total !== null ? sum + i.total : sum),
      0,
    );

    return {
      id: rq.id,
      numero_rq: rq.numero_rq,
      lote: rq.lote,
      categoria: rq.categoria,
      lugar: rq.lugar,
      field_id: rq.field_id,
      fecha: rq.fecha,
      nombre_solicitante: rq.nombre_solicitante,
      numero_contrato: rq.numero_contrato,
      estado: rq.estado,
      firmado_supervisor: !!rq.firma_supervisor_url,
      firmado_encargado: !!rq.firma_encargado_url,
      firma_supervisor_url: rq.firma_supervisor_url,
      firma_encargado_url: rq.firma_encargado_url,
      total_general,
      items: allItems,
      created_at: rq.created_at,
      updated_at: rq.updated_at,
    };
  }

  async update(id: string, dto: UpdateRequisicionDto) {
    const rq = await this.rqRepo.findOne({ where: { id } });
    if (!rq) throw new NotFoundException('Requisicion no encontrada');
    Object.assign(rq, dto);
    await this.rqRepo.save(rq);
    return this.findOne(id);
  }

  async llenadoSupervisor(id: string, dto: LlenadoSupervisorDto) {
    const rq = await this.rqRepo.findOne({ where: { id } });
    if (!rq) throw new NotFoundException('Requisicion no encontrada');

    Object.assign(rq, {
      fecha: dto.fecha,
      nombre_solicitante: dto.nombre_solicitante,
      numero_contrato: dto.numero_contrato,
      estado: EstadoRequisicion.COMPLETADA,
    });
    await this.rqRepo.save(rq);

    for (const itemDto of dto.items) {
      await this.itemRepo.update(itemDto.id, { solicitado: itemDto.solicitado });
    }

    return this.findOne(id);
  }

  async updateEstado(id: string, dto: UpdateEstadoDto) {
    const rq = await this.rqRepo.findOne({ where: { id } });
    if (!rq) throw new NotFoundException('Requisicion no encontrada');
    rq.estado = dto.estado;
    await this.rqRepo.save(rq);
    return { id: rq.id, estado: rq.estado };
  }

  async updateFacturas(id: string, dto: UpdateFacturasDto) {
    const rq = await this.rqRepo.findOne({ where: { id } });
    if (!rq) throw new NotFoundException('Requisicion no encontrada');

    const adicionales = await this.rqAdicionalRepo.find({ where: { requisicion_id: id } });
    const adicionalIds = new Set(adicionales.map(a => a.id));

    for (const itemDto of dto.items) {
      const patch = {
        ...(itemDto.numero_factura    !== undefined && { numero_factura:    itemDto.numero_factura }),
        ...(itemDto.precio_real       !== undefined && { precio_real:       itemDto.precio_real }),
        ...(itemDto.proveedor_factura !== undefined && { proveedor_factura: itemDto.proveedor_factura }),
      };
      if (adicionalIds.has(itemDto.id) || itemDto.es_adicional) {
        await this.rqAdicionalRepo.update(itemDto.id, patch);
      } else {
        await this.itemRepo.update(itemDto.id, patch);
      }
    }

    return this.findOne(id);
  }

  async remove(id: string) {
    const rq = await this.rqRepo.findOne({ where: { id } });
    if (!rq) throw new NotFoundException('Requisicion no encontrada');
    await this.rqRepo.remove(rq);
    return { message: 'Requisicion eliminada correctamente' };
  }
}
