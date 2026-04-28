import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ViaReport } from '../entities/via-report.entity';
import { ViaReportItem } from '../entities/via-report-item.entity';
import { ViaMonthlyLog } from '../entities/via-monthly-log.entity';
import { ViaCaptureGroup } from '../entities/via-capture-group.entity';
import { User } from '../../../users/entities/user.entity';
import { CreateReportDto } from '../dto/create-report.dto';

@Injectable()
export class ViaReportsService {
  constructor(
    @InjectRepository(ViaReport)       private reportRepo: Repository<ViaReport>,
    @InjectRepository(ViaReportItem)   private itemRepo: Repository<ViaReportItem>,
    @InjectRepository(ViaMonthlyLog)   private logRepo: Repository<ViaMonthlyLog>,
    @InjectRepository(ViaCaptureGroup) private groupRepo: Repository<ViaCaptureGroup>,
  ) {}

  async create(dto: CreateReportDto, currentUser: User) {
    const log = await this.logRepo.findOne({
      where: { id: dto.monthly_log_id },
      relations: ['field', 'capture_groups'],
    });
    if (!log) throw new NotFoundException('Registro mensual no encontrado');

    if (dto.type === 'mensual') {
      const existing = await this.reportRepo.findOne({
        where: { monthly_log: { id: dto.monthly_log_id }, type: 'mensual', deleted_at: null as any },
      });
      if (existing) throw new ConflictException('Ya existe un informe mensual para este registro');
    }

    const groupIds = log.capture_groups.map((g) => g.id);
    for (const item of dto.items) {
      if (item.capture_group_id && !groupIds.includes(item.capture_group_id)) {
        throw new BadRequestException(`El grupo de capturas ${item.capture_group_id} no pertenece a este registro mensual`);
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
        const captureGroup = itemDto.capture_group_id
          ? await this.groupRepo.findOne({
              where: { id: itemDto.capture_group_id },
              relations: ['images'],
            })
          : null;
        return this.itemRepo.save(
          this.itemRepo.create({
            report:        saved,
            capture_group: captureGroup ?? null,
            via_name:      itemDto.via_name,
            state:         itemDto.state as any,
            observations:  itemDto.observations ?? null,
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
        'items', 'items.capture_group', 'items.capture_group.images',
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
      .filter((i) => i.capture_group?.lat != null && i.capture_group?.lng != null)
      .map((i) => ({
        item_id:      i.id,
        via_name:     i.via_name,
        state:        i.state,
        lat:          Number(i.capture_group!.lat),
        lng:          Number(i.capture_group!.lng),
        images:       (i.capture_group!.images ?? []).map((img) => img.url),
        captured_at:  i.capture_group!.captured_at,
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
        id:            i.id,
        via_name:      i.via_name,
        state:         i.state,
        observations:  i.observations,
        capture_group: i.capture_group
          ? {
              id:         i.capture_group.id,
              lat:        i.capture_group.lat != null ? Number(i.capture_group.lat) : null,
              lng:        i.capture_group.lng != null ? Number(i.capture_group.lng) : null,
              via_name:   i.capture_group.via_name,
              comment:    i.capture_group.comment,
              images:     (i.capture_group.images ?? []).map((img) => ({
                id:  img.id,
                url: img.url,
              })),
              captured_at: i.capture_group.captured_at,
            }
          : null,
      })),
      map_points: mapPoints,
    };
  }
}
