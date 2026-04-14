import {
  Injectable, NotFoundException, BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Deliverable, FormatType } from '../deliverables/deliverable.entity';
import { TaxiRecord } from './taxi-record.entity';
import { PernoctacionRecord } from './pernoctacion-record.entity';
import { DisponibilidadRecord } from './disponibilidad-record.entity';
import { HorasExtraRecord } from './horas-extra-record.entity';
import { Employee } from '../../plants/employees/entities/employee.entity';
import { BulkTaxiDto } from './dto/taxi-row.dto';
import { BulkPernoctacionDto } from './dto/pernoctacion-row.dto';
import { BulkDisponibilidadDto } from './dto/disponibilidad-row.dto';
import { BulkHorasExtraDto } from './dto/horas-extra-row.dto';

@Injectable()
export class FormatsService {
  constructor(
    @InjectRepository(Deliverable)          private deliverableRepo: Repository<Deliverable>,
    @InjectRepository(TaxiRecord)           private taxiRepo: Repository<TaxiRecord>,
    @InjectRepository(PernoctacionRecord)   private pernoctacionRepo: Repository<PernoctacionRecord>,
    @InjectRepository(DisponibilidadRecord) private disponibilidadRepo: Repository<DisponibilidadRecord>,
    @InjectRepository(HorasExtraRecord)     private horasExtraRepo: Repository<HorasExtraRecord>,
    @InjectRepository(Employee)             private employeeRepo: Repository<Employee>,
    private dataSource: DataSource,
  ) {}

  // -----------------------------------------------------------------------
  // Valida que el deliverable exista y sea del tipo esperado.
  // -----------------------------------------------------------------------
  private async getDeliverable(id: string, expectedType: FormatType) {
    const d = await this.deliverableRepo.findOne({
      where: { id },
      relations: ['field'],
    });
    if (!d) throw new NotFoundException('Entregable no encontrado');
    if (d.format_type !== expectedType)
      throw new BadRequestException(
        `El entregable es de tipo "${d.format_type}", no "${expectedType}"`,
      );
    return d;
  }

  // Valida que los employee_ids existan y pertenezcan a la misma planta del deliverable.
  private async validateEmployees(ids: string[], fieldId: string) {
    const employees = await this.employeeRepo
      .createQueryBuilder('e')
      .where('e.id IN (:...ids)', { ids })
      .andWhere('e.field_id = :fieldId', { fieldId })
      .andWhere('e.deleted_at IS NULL')
      .getMany();

    if (employees.length !== ids.length) {
      const found = new Set(employees.map((e) => e.id));
      const missing = ids.filter((id) => !found.has(id));
      throw new BadRequestException(
        `Empleados no encontrados o no pertenecen a la planta: ${missing.join(', ')}`,
      );
    }
    return employees;
  }

  // -----------------------------------------------------------------------
  // TAXI
  // Estrategia: reemplaza todos los registros existentes del deliverable.
  // El supervisor puede re-subir el formato completo cuantas veces quiera.
  // -----------------------------------------------------------------------
  async upsertTaxi(deliverableId: string, dto: BulkTaxiDto) {
    const d = await this.getDeliverable(deliverableId, FormatType.TAXI);
    const employeeIds = [...new Set(dto.rows.map((r) => r.employee_id))];
    await this.validateEmployees(employeeIds, d.field.id);

    await this.dataSource.transaction(async (em) => {
      await em.delete(TaxiRecord, { deliverable: { id: deliverableId } });
      const rows = dto.rows.map((r) =>
        em.create(TaxiRecord, {
          deliverable: d,
          employee:    { id: r.employee_id },
          fecha:       r.fecha,
          desde:       r.desde,
          hasta:       r.hasta,
          trayecto_taxi: r.trayecto_taxi,
          descripcion: r.descripcion,
        }),
      );
      await em.save(TaxiRecord, rows);
    });

    return { message: `${dto.rows.length} filas de taxi guardadas`, deliverable_id: deliverableId };
  }

  async getTaxi(deliverableId: string) {
    await this.getDeliverable(deliverableId, FormatType.TAXI);
    return this.taxiRepo.find({
      where: { deliverable: { id: deliverableId } },
      relations: ['employee'],
      order: { fecha: 'ASC' },
    });
  }

  // -----------------------------------------------------------------------
  // PERNOCTACION
  // -----------------------------------------------------------------------
  async upsertPernoctacion(deliverableId: string, dto: BulkPernoctacionDto) {
    const d = await this.getDeliverable(deliverableId, FormatType.PERNOCTACION);
    const employeeIds = [...new Set(dto.rows.map((r) => r.employee_id))];
    await this.validateEmployees(employeeIds, d.field.id);

    await this.dataSource.transaction(async (em) => {
      await em.delete(PernoctacionRecord, { deliverable: { id: deliverableId } });
      const rows = dto.rows.map((r) =>
        em.create(PernoctacionRecord, {
          deliverable: d,
          employee:    { id: r.employee_id },
          fecha:       r.fecha,
          vr_dia:      r.vr_dia,
        }),
      );
      await em.save(PernoctacionRecord, rows);
    });

    return { message: `${dto.rows.length} filas de pernoctacion guardadas`, deliverable_id: deliverableId };
  }

  async getPernoctacion(deliverableId: string) {
    await this.getDeliverable(deliverableId, FormatType.PERNOCTACION);
    return this.pernoctacionRepo.find({
      where: { deliverable: { id: deliverableId } },
      relations: ['employee'],
      order: { fecha: 'ASC' },
    });
  }

  // -----------------------------------------------------------------------
  // DISPONIBILIDAD
  // -----------------------------------------------------------------------
  async upsertDisponibilidad(deliverableId: string, dto: BulkDisponibilidadDto) {
    const d = await this.getDeliverable(deliverableId, FormatType.DISPONIBILIDAD);
    const employeeIds = [...new Set(dto.rows.map((r) => r.employee_id))];
    await this.validateEmployees(employeeIds, d.field.id);

    await this.dataSource.transaction(async (em) => {
      await em.delete(DisponibilidadRecord, { deliverable: { id: deliverableId } });
      const rows = dto.rows.map((r) =>
        em.create(DisponibilidadRecord, {
          deliverable:   d,
          employee:      { id: r.employee_id },
          fecha_inicio:  r.fecha_inicio,
          fecha_final:   r.fecha_final,
          valor_total:   r.valor_total,
          descripcion:   r.descripcion,
          quien_reporta: r.quien_reporta,
        }),
      );
      await em.save(DisponibilidadRecord, rows);
    });

    return { message: `${dto.rows.length} filas de disponibilidad guardadas`, deliverable_id: deliverableId };
  }

  async getDisponibilidad(deliverableId: string) {
    await this.getDeliverable(deliverableId, FormatType.DISPONIBILIDAD);
    return this.disponibilidadRepo.find({
      where: { deliverable: { id: deliverableId } },
      relations: ['employee'],
      order: { fecha_inicio: 'ASC' },
    });
  }

  // -----------------------------------------------------------------------
  // HORAS EXTRA
  // -----------------------------------------------------------------------
  async upsertHorasExtra(deliverableId: string, dto: BulkHorasExtraDto) {
    const d = await this.getDeliverable(deliverableId, FormatType.HORAS_EXTRA);
    const employeeIds = [...new Set(dto.rows.map((r) => r.employee_id))];
    await this.validateEmployees(employeeIds, d.field.id);

    await this.dataSource.transaction(async (em) => {
      await em.delete(HorasExtraRecord, { deliverable: { id: deliverableId } });
      const rows = dto.rows.map((r) =>
        em.create(HorasExtraRecord, {
          deliverable:  d,
          employee:     { id: r.employee_id },
          fecha_reporte: r.fecha_reporte,
          entrada:      r.entrada,
          salida:       r.salida,
          hed:  r.hed,
          hen:  r.hen,
          hfd:  r.hfd,
          hefd: r.hefd,
          hefn: r.hefn,
          rn:   r.rn,
          actividad: r.actividad,
        }),
      );
      await em.save(HorasExtraRecord, rows);
    });

    return { message: `${dto.rows.length} filas de horas extra guardadas`, deliverable_id: deliverableId };
  }

  async getHorasExtra(deliverableId: string) {
    await this.getDeliverable(deliverableId, FormatType.HORAS_EXTRA);
    return this.horasExtraRepo.find({
      where: { deliverable: { id: deliverableId } },
      relations: ['employee'],
      order: { fecha_reporte: 'ASC' },
    });
  }
}
