import {
  Injectable, NotFoundException, ConflictException, BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Schedule, ScheduleEstado, ScheduleTipo } from './schedule.entity';
import { ScheduleDay } from './schedule-day.entity';
import { Deliverable, FormatType } from '../deliverables/deliverable.entity';
import { Field } from '../../plants/fields/entities/field.entity';
import { Employee } from '../../plants/employees/entities/employee.entity';
import { User } from '../../users/entities/user.entity';
import { CreateScheduleDto } from './dto/create-schedule.dto';
import { UpsertScheduleDaysDto } from './dto/upsert-schedule-days.dto';

@Injectable()
export class SchedulesService {
  constructor(
    @InjectRepository(Schedule)     private scheduleRepo: Repository<Schedule>,
    @InjectRepository(ScheduleDay)  private dayRepo: Repository<ScheduleDay>,
    @InjectRepository(Deliverable)  private deliverableRepo: Repository<Deliverable>,
    @InjectRepository(Field)        private fieldRepo: Repository<Field>,
    @InjectRepository(Employee)     private employeeRepo: Repository<Employee>,
    private dataSource: DataSource,
  ) {}

  // -----------------------------------------------------------------------
  // Crea el schedule header para una planta/mes/tipo.
  // Uno por tipo (6x6 o 5x2) por mes por planta.
  // -----------------------------------------------------------------------
  async create(dto: CreateScheduleDto, currentUser: User) {
    const field = await this.fieldRepo.findOne({
      where: { id: dto.field_id },
      relations: ['supervisor'],
    });
    if (!field) throw new NotFoundException('Planta no encontrada');

    const existing = await this.scheduleRepo.findOne({
      where: { field: { id: dto.field_id }, mes: dto.mes, anio: dto.anio, tipo: dto.tipo },
    });
    if (existing)
      throw new ConflictException(
        `Ya existe un schedule ${dto.tipo} para esta planta en ${dto.mes}/${dto.anio}`,
      );

    const supervisor = field.supervisor ?? currentUser;

    const schedule = this.scheduleRepo.create({
      field,
      supervisor,
      mes:    dto.mes,
      anio:   dto.anio,
      tipo:   dto.tipo,
      estado: ScheduleEstado.BORRADOR,
    });

    return this.scheduleRepo.save(schedule);
  }

  async findAll(filters: { field_id?: string; mes?: number; anio?: number; tipo?: ScheduleTipo }) {
    const qb = this.scheduleRepo
      .createQueryBuilder('s')
      .leftJoinAndSelect('s.field', 'field')
      .leftJoinAndSelect('s.supervisor', 'supervisor')
      .orderBy('s.anio', 'DESC')
      .addOrderBy('s.mes', 'DESC');

    if (filters.field_id) qb.andWhere('field.id = :fid', { fid: filters.field_id });
    if (filters.mes)      qb.andWhere('s.mes = :mes',   { mes: filters.mes });
    if (filters.anio)     qb.andWhere('s.anio = :anio', { anio: filters.anio });
    if (filters.tipo)     qb.andWhere('s.tipo = :tipo', { tipo: filters.tipo });

    return qb.getMany();
  }

  // Devuelve el schedule con todos los dias agrupados por empleado.
  async findOne(id: string) {
    const schedule = await this.scheduleRepo.findOne({
      where: { id },
      relations: ['field', 'supervisor', 'days', 'days.employee'],
    });
    if (!schedule) throw new NotFoundException('Schedule no encontrado');

    // Agrupar dias por empleado para facilitar lectura en el front
    const byEmployee: Record<string, { employee: any; days: any[] }> = {};
    for (const day of schedule.days) {
      const eid = day.employee.id;
      if (!byEmployee[eid]) {
        byEmployee[eid] = { employee: day.employee, days: [] };
      }
      byEmployee[eid].days.push({ fecha: day.fecha, turno: day.turno, id: day.id });
    }

    return {
      ...schedule,
      days: undefined,
      employees: Object.values(byEmployee).map((e) => ({
        ...e,
        days: e.days.sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime()),
      })),
    };
  }

  // -----------------------------------------------------------------------
  // Upsert masivo de dias: reemplaza todos los dias existentes del schedule.
  // El supervisor puede re-subir la grilla completa del mes cuantas veces
  // quiera mientras el schedule este en borrador.
  // -----------------------------------------------------------------------
  async upsertDays(scheduleId: string, dto: UpsertScheduleDaysDto) {
    const schedule = await this.scheduleRepo.findOne({
      where: { id: scheduleId },
      relations: ['field'],
    });
    if (!schedule) throw new NotFoundException('Schedule no encontrado');
    if (schedule.estado === ScheduleEstado.CERRADO)
      throw new BadRequestException('El schedule esta cerrado y no puede modificarse');

    // Validar que todos los empleados pertenecen a la planta
    const employeeIds = [...new Set(dto.days.map((d) => d.employee_id))];
    const employees = await this.employeeRepo
      .createQueryBuilder('e')
      .where('e.id IN (:...ids)', { ids: employeeIds })
      .andWhere('e.field_id = :fieldId', { fieldId: schedule.field.id })
      .andWhere('e.deleted_at IS NULL')
      .getMany();

    if (employees.length !== employeeIds.length) {
      const found = new Set(employees.map((e) => e.id));
      const missing = employeeIds.filter((id) => !found.has(id));
      throw new BadRequestException(
        `Empleados no pertenecen a la planta: ${missing.join(', ')}`,
      );
    }

    await this.dataSource.transaction(async (em) => {
      await em.delete(ScheduleDay, { schedule: { id: scheduleId } });
      const rows = dto.days.map((d) =>
        em.create(ScheduleDay, {
          schedule: { id: scheduleId },
          employee: { id: d.employee_id },
          fecha:    d.fecha,
          turno:    d.turno,
        }),
      );
      await em.save(ScheduleDay, rows);
    });

    return {
      message: `${dto.days.length} asignaciones guardadas`,
      schedule_id: scheduleId,
    };
  }

  // -----------------------------------------------------------------------
  // Cierra el schedule y lo vincula al entregable correspondiente.
  // Busca el deliverable del mes (schedule_6x6 o schedule_5x2) y lo marca.
  // -----------------------------------------------------------------------
  async close(scheduleId: string) {
    const schedule = await this.scheduleRepo.findOne({
      where: { id: scheduleId },
      relations: ['field', 'supervisor'],
    });
    if (!schedule) throw new NotFoundException('Schedule no encontrado');
    if (schedule.estado === ScheduleEstado.CERRADO)
      throw new BadRequestException('El schedule ya esta cerrado');

    const formatType = schedule.tipo === ScheduleTipo.SIX_BY_SIX
      ? FormatType.SCHEDULE_6X6
      : FormatType.SCHEDULE_5X2;

    // Buscar el entregable correspondiente del mes
    const deliverable = await this.deliverableRepo.findOne({
      where: {
        field:       { id: schedule.field.id },
        mes:         schedule.mes,
        anio:        schedule.anio,
        format_type: formatType,
      },
    });

    schedule.estado = ScheduleEstado.CERRADO;
    if (deliverable) {
      schedule.deliverable = deliverable;
    }

    return this.scheduleRepo.save(schedule);
  }
}
