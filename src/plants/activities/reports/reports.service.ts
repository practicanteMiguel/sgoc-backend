import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TechnicalReport } from './entities/technical-report.entity';
import { WeeklyLog } from '../logbook/entities/weekly-log.entity';
import { LogActivity } from '../logbook/entities/log-activity.entity';
import { User } from '../../../users/entities/user.entity';
import { CreateReportDto } from './dto/create-report.dto';
import { UpdateReportDto } from './dto/update-report.dto';

@Injectable()
export class ReportsService {
  constructor(
    @InjectRepository(TechnicalReport) private reportRepo: Repository<TechnicalReport>,
    @InjectRepository(WeeklyLog)       private logRepo: Repository<WeeklyLog>,
    @InjectRepository(LogActivity)     private activityRepo: Repository<LogActivity>,
  ) {}

  async create(dto: CreateReportDto, currentUser: User) {
    const log = await this.logRepo.findOne({
      where: { id: dto.log_id },
      relations: ['crew', 'crew.field', 'activities'],
    });
    if (!log) throw new NotFoundException('Weekly log not found');

    const existing = await this.reportRepo.findOne({
      where: { weekly_log: { id: dto.log_id } },
    });
    if (existing)
      throw new ConflictException('A technical report already exists for this weekly log');

    const logActivityIds = log.activities.map((a) => a.id);
    for (const item of dto.activities) {
      if (!logActivityIds.includes(item.activity_id))
        throw new BadRequestException(`Activity ${item.activity_id} does not belong to this weekly log`);
    }

    // Update each activity with its report fields
    for (const item of dto.activities) {
      await this.activityRepo.update(item.activity_id, {
        requirement:         item.requirement,
        additional_resource: item.additional_resource,
        progress:            item.progress,
        is_scheduled:        item.is_scheduled ?? false,
      });
    }

    const report = this.reportRepo.create({
      weekly_log:  log,
      crew:        log.crew,
      created_by:  currentUser,
    });

    return this.reportRepo.save(report);
  }

  async findAll(page = 1, limit = 20, crewId?: string) {
    const qb = this.reportRepo
      .createQueryBuilder('r')
      .leftJoinAndSelect('r.crew', 'crew')
      .leftJoinAndSelect('crew.field', 'field')
      .leftJoinAndSelect('r.weekly_log', 'weekly_log')
      .leftJoinAndSelect('weekly_log.activities', 'activities')
      .where('r.deleted_at IS NULL')
      .orderBy('r.created_at', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (crewId) qb.andWhere('crew.id = :crewId', { crewId });

    const [data, total] = await qb.getManyAndCount();

    const cleaned = data.map((r) => this.formatReport(r));
    return { data: cleaned, total, page, limit, pages: Math.ceil(total / limit) };
  }

  async findOne(id: string) {
    const report = await this.reportRepo.findOne({
      where: { id },
      relations: ['crew', 'crew.field', 'weekly_log', 'weekly_log.activities', 'created_by'],
    });
    if (!report) throw new NotFoundException('Report not found');
    return this.formatReport(report);
  }

  async update(id: string, dto: UpdateReportDto) {
    const report = await this.reportRepo.findOne({
      where: { id },
      relations: ['weekly_log', 'weekly_log.activities'],
    });
    if (!report) throw new NotFoundException('Report not found');

    const logActivityIds = report.weekly_log.activities.map((a) => a.id);
    for (const item of dto.activities) {
      if (!logActivityIds.includes(item.activity_id))
        throw new BadRequestException(`Activity ${item.activity_id} does not belong to this report's weekly log`);
    }

    for (const item of dto.activities) {
      await this.activityRepo.update(item.activity_id, {
        requirement:         item.requirement,
        additional_resource: item.additional_resource,
        progress:            item.progress,
        is_scheduled:        item.is_scheduled,
      });
    }

    return this.findOne(id);
  }

  async remove(id: string) {
    const report = await this.reportRepo.findOne({ where: { id } });
    if (!report) throw new NotFoundException('Report not found');
    await this.reportRepo.softDelete(id);
    return { message: 'Report deleted successfully' };
  }

  private formatReport(r: TechnicalReport & { weekly_log: any; crew: any }) {
    return {
      id:         r.id,
      created_at: r.created_at,
      crew: {
        id:    r.crew.id,
        name:  r.crew.name,
        field: r.crew.field,
      },
      weekly_log: {
        id:          r.weekly_log.id,
        week_number: r.weekly_log.week_number,
        year:        r.weekly_log.year,
        activities:  r.weekly_log.activities.map((a: any) => ({
          id:                  a.id,
          description:         a.description,
          start_date:          a.start_date,
          end_date:            a.end_date,
          notes:               a.notes,
          image_before:        a.image_before,
          image_during:        a.image_during,
          image_after:         a.image_after,
          requirement:         a.requirement,
          additional_resource: a.additional_resource,
          progress:            a.progress,
          is_scheduled:        a.is_scheduled,
        })),
      },
    };
  }
}
