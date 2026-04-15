import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Deliverable, DeliverableStatus, FormatType } from './deliverable.entity';
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

export interface ReminderResult {
  case: 'warning_3_days' | 'deadline_pending' | 'deadline_complete';
  supervisor_id: string;
  field_name: string;
  mes: number;
  anio: number;
  pending_formats: string[];
  notification_title: string;
}

@Injectable()
export class DeliverableRemindersService {
  private readonly logger = new Logger(DeliverableRemindersService.name);

  constructor(
    @InjectRepository(Deliverable)
    private readonly deliverableRepo: Repository<Deliverable>,
    private readonly notificationsService: NotificationsService,
  ) {}

  // Corre todos los dias a las 8:00 AM
  @Cron('0 8 * * *')
  async sendDailyReminders(): Promise<void> {
    await this.triggerReminders();
  }

  // Metodo publico para pruebas: acepta una fecha simulada como "hoy"
  async triggerReminders(simulateTodayStr?: string): Promise<{
    simulated_today: string;
    deadline_date: string;
    warning_date: string;
    notifications_sent: ReminderResult[];
  }> {
    const today = simulateTodayStr
      ? this.parseDateStr(simulateTodayStr)
      : new Date();

    const todayStr    = this.toDateString(today);
    const in3DaysStr  = this.toDateString(this.addDays(today, 3));

    const [deadlineResults, warningResults] = await Promise.all([
      this.processForDate(todayStr, 'deadline'),
      this.processForDate(in3DaysStr, 'warning'),
    ]);

    const all = [...deadlineResults, ...warningResults];
    this.logger.log(`Reminders trigger [today=${todayStr}]: ${all.length} notificacion(es) enviada(s)`);

    return {
      simulated_today:    todayStr,
      deadline_date:      todayStr,
      warning_date:       in3DaysStr,
      notifications_sent: all,
    };
  }

  private async processForDate(dateStr: string, mode: 'warning' | 'deadline'): Promise<ReminderResult[]> {
    const deliverables = await this.deliverableRepo
      .createQueryBuilder('d')
      .leftJoinAndSelect('d.supervisor', 'supervisor')
      .leftJoinAndSelect('d.field', 'field')
      .where('CAST(d.due_date AS text) = :date', { date: dateStr })
      .getMany();

    if (!deliverables.length) return [];

    const groups = new Map<string, Deliverable[]>();
    for (const d of deliverables) {
      if (!d.supervisor) continue;
      const key = `${d.supervisor.id}|${d.field.id}|${d.mes}|${d.anio}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(d);
    }

    const results: ReminderResult[] = [];

    for (const items of groups.values()) {
      const { supervisor, field, mes, anio } = items[0];
      const pendientes = items.filter((d) => d.status === DeliverableStatus.PENDIENTE);

      if (mode === 'warning' && pendientes.length > 0) {
        const title = await this.sendWarningNotification(supervisor.id, field.name, mes, anio, dateStr, pendientes);
        results.push({
          case: 'warning_3_days',
          supervisor_id: supervisor.id,
          field_name: field.name,
          mes,
          anio,
          pending_formats: pendientes.map((d) => FORMAT_LABELS[d.format_type]),
          notification_title: title,
        });
      } else if (mode === 'deadline') {
        if (pendientes.length > 0) {
          const title = await this.sendDeadlineNotification(supervisor.id, field.name, mes, anio, pendientes);
          results.push({
            case: 'deadline_pending',
            supervisor_id: supervisor.id,
            field_name: field.name,
            mes,
            anio,
            pending_formats: pendientes.map((d) => FORMAT_LABELS[d.format_type]),
            notification_title: title,
          });
        } else {
          const title = await this.sendCompletionNotification(supervisor.id, field.name, mes, anio);
          results.push({
            case: 'deadline_complete',
            supervisor_id: supervisor.id,
            field_name: field.name,
            mes,
            anio,
            pending_formats: [],
            notification_title: title,
          });
        }
      }
    }

    return results;
  }

  private async sendWarningNotification(
    supervisorId: string,
    fieldName: string,
    mes: number,
    anio: number,
    dueDateStr: string,
    pendientes: Deliverable[],
  ): Promise<string> {
    const list  = pendientes.map((d) => `- ${FORMAT_LABELS[d.format_type]}`).join('\n');
    const title = `Recordatorio: 3 dias para entregar - ${fieldName}`;
    await this.notificationsService.createSystem({
      user_id:  supervisorId,
      title,
      message:
        `Faltan 3 dias para el cierre de ${MONTH_NAMES[mes]} ${anio} en ${fieldName} ` +
        `(fecha limite: ${dueDateStr}). Formatos pendientes:\n\n${list}`,
      priority: NotificationPriority.MEDIUM,
      type:     NotificationType.ALERT,
      data:     { field_name: fieldName, mes, anio },
    });
    return title;
  }

  private async sendDeadlineNotification(
    supervisorId: string,
    fieldName: string,
    mes: number,
    anio: number,
    pendientes: Deliverable[],
  ): Promise<string> {
    const list  = pendientes.map((d) => `- ${FORMAT_LABELS[d.format_type]}`).join('\n');
    const title = `Fecha limite hoy - ${fieldName}`;
    await this.notificationsService.createSystem({
      user_id:  supervisorId,
      title,
      message:
        `Hoy es la fecha limite para los entregables de ${MONTH_NAMES[mes]} ${anio} en ${fieldName}. ` +
        `La entrega tardia afecta tu puntaje de cumplimiento. Formatos aun pendientes:\n\n${list}`,
      priority: NotificationPriority.HIGH,
      type:     NotificationType.ALERT,
      data:     { field_name: fieldName, mes, anio },
    });
    return title;
  }

  private async sendCompletionNotification(
    supervisorId: string,
    fieldName: string,
    mes: number,
    anio: number,
  ): Promise<string> {
    const title = `Mes por cerrar - ${fieldName}`;
    await this.notificationsService.createSystem({
      user_id:  supervisorId,
      title,
      message:
        `El mes de ${MONTH_NAMES[mes]} ${anio} en ${fieldName} esta por cerrar. ` +
        `Cumpliste con todos los entregables mensuales.`,
      priority: NotificationPriority.LOW,
      type:     NotificationType.SYSTEM,
      data:     { field_name: fieldName, mes, anio },
    });
    return title;
  }

  private toDateString(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  private addDays(date: Date, days: number): Date {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  }

  // Parsea YYYY-MM-DD sin aplicar timezone del sistema
  private parseDateStr(str: string): Date {
    const [y, m, d] = str.split('-').map(Number);
    return new Date(y, m - 1, d);
  }
}
