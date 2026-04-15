import {
  Injectable, NotFoundException, ConflictException, BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  Deliverable, DeliverableStatus, FormatType, REQUIRED_FORMATS,
} from './deliverable.entity';
import { Field } from '../../plants/fields/entities/field.entity';
import { User } from '../../users/entities/user.entity';
import { GenerateMonthDto } from './dto/generate-month.dto';
import { WaiveDeliverableDto } from './dto/waive-deliverable.dto';
import { NotificationsService } from '../../notifications/notifications.service';
import { NotificationPriority } from '../../notifications/entities/enum/notification-priority.enum';
import { NotificationType } from '../../notifications/entities/enum/notification-type.enum';

const FORMAT_LABELS: Record<FormatType, string> = {
  [FormatType.TAXI]:           'Taxi',
  [FormatType.PERNOCTACION]:   'Pernoctacion',
  [FormatType.HORAS_EXTRA]:    'Horas Extra',
  [FormatType.DISPONIBILIDAD]: 'Disponibilidad',
  [FormatType.SCHEDULE_6X6]:   'Horario 6x6',
  [FormatType.SCHEDULE_5X2]:   'Horario 5x2',
};

const MONTH_NAMES = [
  '', 'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

@Injectable()
export class DeliverablesService {
  constructor(
    @InjectRepository(Deliverable) private deliverableRepo: Repository<Deliverable>,
    @InjectRepository(Field)       private fieldRepo: Repository<Field>,
    private readonly notificationsService: NotificationsService,
  ) {}

  // -----------------------------------------------------------------------
  // Genera los 6 entregables pendientes para una planta en un mes dado.
  // Lanza ConflictException si ya existen para ese mes.
  // -----------------------------------------------------------------------
  async generateMonth(dto: GenerateMonthDto, currentUser: User) {
    const field = await this.fieldRepo.findOne({
      where: { id: dto.field_id },
      relations: ['supervisor'],
    });
    if (!field) throw new NotFoundException('Planta no encontrada');

    // Verificar que no existan ya
    const existing = await this.deliverableRepo.count({
      where: { field: { id: dto.field_id }, mes: dto.mes, anio: dto.anio },
    });
    if (existing > 0)
      throw new ConflictException(
        `Ya existen entregables para ${field.name} en ${dto.mes}/${dto.anio}`,
      );

    const supervisor = field.supervisor ?? currentUser;

    const dueDate = dto.due_date
      ? this.parseDateLocal(dto.due_date)
      : this.lastDayOfMonth(dto.anio, dto.mes);

    const rows = REQUIRED_FORMATS.map((fmt) =>
      this.deliverableRepo.create({
        field,
        supervisor,
        mes:         dto.mes,
        anio:        dto.anio,
        format_type: fmt as FormatType,
        status:      DeliverableStatus.PENDIENTE,
        due_date:    dueDate,
      }),
    );

    const saved = await this.deliverableRepo.save(rows);

    if (field.supervisor) {
      const list = REQUIRED_FORMATS.map((fmt) => `- ${FORMAT_LABELS[fmt as FormatType]}`).join('\n');
      const dueDateStr = dueDate.toISOString().slice(0, 10);
      void this.notificationsService.createSystem({
        user_id: field.supervisor.id,
        title: `Entregables de ${MONTH_NAMES[dto.mes]} ${dto.anio} cargados - ${field.name}`,
        message:
          `Se han generado los entregables de ${MONTH_NAMES[dto.mes]} ${dto.anio} para ${field.name}. ` +
          `Tienes hasta el ${dueDateStr} para subir los siguientes formatos:\n\n${list}`,
        priority: NotificationPriority.MEDIUM,
        type: NotificationType.SYSTEM,
        data: { field_id: dto.field_id, mes: dto.mes, anio: dto.anio },
      });
    }

    return {
      message: `6 entregables generados para ${field.name} - ${dto.mes}/${dto.anio}`,
      deliverables: saved,
    };
  }

  // -----------------------------------------------------------------------
  // Lista entregables con filtros opcionales.
  // -----------------------------------------------------------------------
  async findAll(filters: {
    field_id?: string;
    mes?: number;
    anio?: number;
    status?: DeliverableStatus;
    format_type?: FormatType;
  }) {
    const qb = this.deliverableRepo
      .createQueryBuilder('d')
      .leftJoinAndSelect('d.field', 'field')
      .leftJoinAndSelect('d.supervisor', 'supervisor')
      .leftJoinAndSelect('d.waived_by', 'waived_by')
      .leftJoinAndSelect('d.last_viewed_by', 'last_viewed_by')
      .orderBy('d.anio', 'DESC')
      .addOrderBy('d.mes', 'DESC');

    if (filters.field_id)   qb.andWhere('field.id = :fid',         { fid: filters.field_id });
    if (filters.mes)        qb.andWhere('d.mes = :mes',            { mes: filters.mes });
    if (filters.anio)       qb.andWhere('d.anio = :anio',          { anio: filters.anio });
    if (filters.status)     qb.andWhere('d.status = :status',      { status: filters.status });
    if (filters.format_type) qb.andWhere('d.format_type = :ft',   { ft: filters.format_type });

    return qb.getMany();
  }

  async findOne(id: string) {
    const d = await this.deliverableRepo.findOne({
      where: { id },
      relations: ['field', 'supervisor', 'waived_by', 'last_viewed_by'],
    });
    if (!d) throw new NotFoundException('Entregable no encontrado');
    return d;
  }

  // -----------------------------------------------------------------------
  // Marca un entregable como entregado.
  // Si today > due_date -> entregado_tarde.
  // -----------------------------------------------------------------------
  async submit(id: string) {
    const d = await this.findOne(id);

    if (d.status === DeliverableStatus.NO_APLICA)
      throw new BadRequestException(
        'Este entregable fue marcado como no aplica. Reviertalo primero si desea entregarlo.',
      );

    if (d.status !== DeliverableStatus.PENDIENTE)
      throw new BadRequestException(
        `El entregable ya fue marcado como "${d.status}"`,
      );

    const now = new Date();
    d.submitted_at = now;
    d.status = d.due_date && now > new Date(d.due_date)
      ? DeliverableStatus.ENTREGADO_TARDE
      : DeliverableStatus.ENTREGADO;

    return this.deliverableRepo.save(d);
  }

  // -----------------------------------------------------------------------
  // Marca un entregable como no_aplica para ese mes.
  // El score se calcula sobre los aplicables, no sobre 6 fijos.
  // Solo aplica si el entregable esta pendiente.
  // -----------------------------------------------------------------------
  async waive(id: string, dto: WaiveDeliverableDto, currentUser: User) {
    const d = await this.deliverableRepo.findOne({
      where: { id },
      relations: ['field', 'supervisor'],
    });
    if (!d) throw new NotFoundException('Entregable no encontrado');

    if (d.status === DeliverableStatus.ENTREGADO || d.status === DeliverableStatus.ENTREGADO_TARDE)
      throw new BadRequestException(
        'No se puede marcar como no aplica un entregable ya entregado.',
      );

    d.status       = DeliverableStatus.NO_APLICA;
    d.waive_reason = dto.reason;
    d.waived_by    = currentUser;

    return this.deliverableRepo.save(d);
  }

  // -----------------------------------------------------------------------
  // Registra quien vio el entregable y cuando.
  // Lo llama el coordinador al abrir el modal de detalle.
  // -----------------------------------------------------------------------
  async markViewed(id: string, currentUser: User) {
    const d = await this.deliverableRepo.findOne({
      where: { id },
      relations: ['field', 'supervisor', 'last_viewed_by'],
    });
    if (!d) throw new NotFoundException('Entregable no encontrado');

    d.last_viewed_by = currentUser;
    d.last_viewed_at = new Date();

    return this.deliverableRepo.save(d);
  }

  // -----------------------------------------------------------------------
  // Revierte un no_aplica a pendiente (por si el supervisor se equivoco).
  // -----------------------------------------------------------------------
  async unwaive(id: string) {
    const d = await this.findOne(id);

    if (d.status !== DeliverableStatus.NO_APLICA)
      throw new BadRequestException(
        `El entregable no esta en estado no_aplica (esta en "${d.status}")`,
      );

    d.status       = DeliverableStatus.PENDIENTE;
    d.waive_reason = null as any;
    d.waived_by    = null as any;

    return this.deliverableRepo.save(d);
  }

  // -----------------------------------------------------------------------
  // Resumen de cumplimiento por planta y mes.
  // Incluye score: on_time=1pt, tarde=0.5pt, max=6pts -> porcentaje.
  // -----------------------------------------------------------------------
  async complianceSummary(filters: { field_id?: string; anio?: number }) {
    const qb = this.deliverableRepo
      .createQueryBuilder('d')
      .select('field.id',   'field_id')
      .addSelect('field.name', 'field_name')
      .addSelect('d.mes',   'mes')
      .addSelect('d.anio',  'anio')
      .addSelect(
        `COUNT(*) FILTER (WHERE d.status = 'entregado')`,
        'on_time',
      )
      .addSelect(
        `COUNT(*) FILTER (WHERE d.status = 'entregado_tarde')`,
        'tarde',
      )
      .addSelect(
        `COUNT(*) FILTER (WHERE d.status = 'pendiente')`,
        'pendiente',
      )
      .addSelect(
        `COUNT(*) FILTER (WHERE d.status = 'no_aplica')`,
        'no_aplica',
      )
      .addSelect(
        // Denominador = total - no_aplica. Si todos son no_aplica -> score NULL.
        `CASE
          WHEN COUNT(*) FILTER (WHERE d.status != 'no_aplica') = 0 THEN NULL
          ELSE ROUND(
            (COUNT(*) FILTER (WHERE d.status = 'entregado') * 1.0 +
             COUNT(*) FILTER (WHERE d.status = 'entregado_tarde') * 0.5)
            / NULLIF(COUNT(*) FILTER (WHERE d.status != 'no_aplica'), 0)::numeric
            * 100, 1
          )
        END`,
        'score',
      )
      .leftJoin('d.field', 'field')
      .groupBy('field.id')
      .addGroupBy('field.name')
      .addGroupBy('d.mes')
      .addGroupBy('d.anio')
      .orderBy('d.anio', 'DESC')
      .addOrderBy('d.mes', 'DESC')
      .addOrderBy('field.name', 'ASC');

    if (filters.field_id) qb.andWhere('field.id = :fid', { fid: filters.field_id });
    if (filters.anio)     qb.andWhere('d.anio = :anio',  { anio: filters.anio });

    return qb.getRawMany();
  }

  // -----------------------------------------------------------------------
  // Detalle de un mes especifico de una planta:
  // los 6 formatos con su estado.
  // -----------------------------------------------------------------------
  async monthDetail(fieldId: string, anio: number, mes: number) {
    const deliverables = await this.deliverableRepo.find({
      where: { field: { id: fieldId }, anio, mes },
      relations: ['field', 'supervisor'],
      order: { format_type: 'ASC' },
    });

    if (!deliverables.length)
      throw new NotFoundException(
        `No se encontraron entregables para la planta ${fieldId} en ${mes}/${anio}`,
      );

    const on_time   = deliverables.filter((d) => d.status === DeliverableStatus.ENTREGADO).length;
    const tarde     = deliverables.filter((d) => d.status === DeliverableStatus.ENTREGADO_TARDE).length;
    const pendiente = deliverables.filter((d) => d.status === DeliverableStatus.PENDIENTE).length;
    const no_aplica = deliverables.filter((d) => d.status === DeliverableStatus.NO_APLICA).length;
    const aplicables = deliverables.length - no_aplica;
    const score = aplicables === 0
      ? null
      : Math.round(((on_time * 1 + tarde * 0.5) / aplicables) * 100 * 10) / 10;

    return { anio, mes, score, on_time, tarde, pendiente, no_aplica, aplicables, deliverables };
  }

  // -----------------------------------------------------------------------
  private lastDayOfMonth(anio: number, mes: number): Date {
    return new Date(anio, mes, 0); // dia 0 del mes siguiente = ultimo dia del mes actual
  }

  // Parsea YYYY-MM-DD como fecha local para evitar desfase de timezone UTC
  private parseDateLocal(str: string): Date {
    const [y, m, d] = str.split('-').map(Number);
    return new Date(y, m - 1, d);
  }
}
