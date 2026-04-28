import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ViaReport } from '../entities/via-report.entity';
import { ViaReportItem } from '../entities/via-report-item.entity';
import { ViaMonthlyLog } from '../entities/via-monthly-log.entity';
import { ViaCapture } from '../entities/via-capture.entity';
import { User } from '../../../users/entities/user.entity';
import { CreateReportDto } from '../dto/create-report.dto';

@Injectable()
export class ViaReportsService {
  constructor(
    @InjectRepository(ViaReport)     private reportRepo: Repository<ViaReport>,
    @InjectRepository(ViaReportItem) private itemRepo: Repository<ViaReportItem>,
    @InjectRepository(ViaMonthlyLog) private logRepo: Repository<ViaMonthlyLog>,
    @InjectRepository(ViaCapture)    private captureRepo: Repository<ViaCapture>,
  ) {}

  async create(dto: CreateReportDto, currentUser: User) {
    const log = await this.logRepo.findOne({
      where: { id: dto.monthly_log_id },
      relations: ['field', 'captures'],
    });
    if (!log) throw new NotFoundException('Registro mensual no encontrado');

    if (dto.type === 'mensual') {
      const existing = await this.reportRepo.findOne({
        where: { monthly_log: { id: dto.monthly_log_id }, type: 'mensual', deleted_at: null as any },
      });
      if (existing) throw new ConflictException('Ya existe un informe mensual para este registro');
    }

    const captureIds = log.captures.map((c) => c.id);
    for (const item of dto.items) {
      if (item.capture_id && !captureIds.includes(item.capture_id)) {
        throw new BadRequestException(`La captura ${item.capture_id} no pertenece a este registro mensual`);
      }
    }

    const report = this.reportRepo.create({
      monthly_log:          log,
      type:                 dto.type as any,
      general_observations: dto.general_observations ?? null,
      created_by:           currentUser,
    });
    const saved = await this.reportRepo.save(report);

    const items = await Promise.all(
      dto.items.map(async (itemDto) => {
        const capture = itemDto.capture_id
          ? await this.captureRepo.findOne({ where: { id: itemDto.capture_id } })
          : null;
        return this.itemRepo.save(
          this.itemRepo.create({
            report:       saved,
            capture:      capture ?? null,
            via_name:     itemDto.via_name,
            state:        itemDto.state as any,
            observations: itemDto.observations ?? null,
          }),
        );
      }),
    );

    return { ...saved, items };
  }

  async findAll(page = 1, limit = 20, fieldId?: string, type?: string, year?: number, month?: number) {
    const qb = this.reportRepo
      .createQueryBuilder('r')
      .leftJoinAndSelect('r.monthly_log', 'log')
      .leftJoinAndSelect('log.field', 'field')
      .leftJoinAndSelect('r.created_by', 'created_by')
      .where('r.deleted_at IS NULL')
      .orderBy('r.created_at', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (fieldId) qb.andWhere('field.id = :fieldId', { fieldId });
    if (type)    qb.andWhere('r.type = :type', { type });
    if (year)    qb.andWhere('log.year = :year', { year });
    if (month)   qb.andWhere('log.month = :month', { month });

    const [data, total] = await qb.getManyAndCount();
    return { data, total, page, limit, pages: Math.ceil(total / limit) };
  }

  async findOne(id: string) {
    const report = await this.reportRepo.findOne({
      where: { id },
      relations: [
        'monthly_log', 'monthly_log.field',
        'items', 'items.capture',
        'created_by',
      ],
    });
    if (!report) throw new NotFoundException('Informe no encontrado');
    return this.formatWithMap(report);
  }

  async remove(id: string) {
    const report = await this.reportRepo.findOne({ where: { id } });
    if (!report) throw new NotFoundException('Informe no encontrado');
    await this.reportRepo.softDelete(id);
    return { message: 'Informe eliminado correctamente' };
  }

  private formatWithMap(r: ViaReport) {
    const mapPoints = (r.items ?? [])
      .filter((i) => i.capture?.lat != null && i.capture?.lng != null)
      .map((i) => ({
        item_id:      i.id,
        via_name:     i.via_name,
        state:        i.state,
        lat:          Number(i.capture!.lat),
        lng:          Number(i.capture!.lng),
        capture_url:  i.capture!.url,
        captured_at:  i.capture!.captured_at,
      }));

    return {
      id:                   r.id,
      type:                 r.type,
      general_observations: r.general_observations,
      created_at:           r.created_at,
      monthly_log: {
        id:    (r.monthly_log as any).id,
        month: (r.monthly_log as any).month,
        year:  (r.monthly_log as any).year,
        field: (r.monthly_log as any).field,
      },
      items: (r.items ?? []).map((i) => ({
        id:           i.id,
        via_name:     i.via_name,
        state:        i.state,
        observations: i.observations,
        capture:      i.capture
          ? {
              id:          i.capture.id,
              url:         i.capture.url,
              lat:         i.capture.lat != null ? Number(i.capture.lat) : null,
              lng:         i.capture.lng != null ? Number(i.capture.lng) : null,
              comment:     i.capture.comment,
              captured_at: i.capture.captured_at,
            }
          : null,
      })),
      map_points: mapPoints,
    };
  }
}
