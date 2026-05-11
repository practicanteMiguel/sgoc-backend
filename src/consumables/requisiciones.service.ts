import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Not, Repository } from 'typeorm';
import { Requisicion, EstadoRequisicion } from './entities/requisicion.entity';
import { RequisicionItem } from './entities/requisicion-item.entity';
import { Insumo, CategoriaInsumo } from './entities/insumo.entity';
import { Field } from '../plants/fields/entities/field.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationPriority } from '../notifications/entities/enum/notification-priority.enum';
import {
  CreateRequisicionDto,
  UpdateRequisicionDto,
  LlenadoSupervisorDto,
  CreateRequisicionMasivoDto,
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
    @InjectRepository(Insumo) private insumoRepo: Repository<Insumo>,
    @InjectRepository(Field) private fieldRepo: Repository<Field>,
    private notificationsService: NotificationsService,
  ) {}

  async create(dto: CreateRequisicionDto) {
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

  async findAll() {
    const rqs = await this.rqRepo.find({ order: { created_at: 'DESC' } });
    return rqs;
  }

  async findOne(id: string) {
    const rq = await this.rqRepo.findOne({
      where: { id },
      relations: ['items', 'items.insumo'],
    });
    if (!rq) throw new NotFoundException('Requisicion no encontrada');

    const itemsConTotal = rq.items.map(item => ({
      id: item.id,
      insumo_id: item.insumo_id,
      codigo: item.insumo.codigo,
      descripcion: item.insumo.descripcion,
      unidad: item.insumo.unidad,
      valor_unitario: item.insumo.valor_unitario,
      proveedor_ordinario: item.insumo.proveedor_ordinario,
      proveedor_extraordinario: item.insumo.proveedor_extraordinario,
      solicitado: item.solicitado,
      total:
        item.solicitado !== null && item.insumo.valor_unitario !== null
          ? Number(item.solicitado) * Number(item.insumo.valor_unitario)
          : null,
    }));

    const total_general = itemsConTotal.reduce(
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
      total_general,
      items: itemsConTotal,
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

  async remove(id: string) {
    const rq = await this.rqRepo.findOne({ where: { id } });
    if (!rq) throw new NotFoundException('Requisicion no encontrada');
    await this.rqRepo.remove(rq);
    return { message: 'Requisicion eliminada correctamente' };
  }
}
