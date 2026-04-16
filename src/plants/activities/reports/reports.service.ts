import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TechnicalReport } from './entities/technical-report.entity';
import { LogActivity } from '../logbook/entities/log-activity.entity';
import { User } from '../../../users/entities/user.entity';
import { CreateReportDto } from './dto/create-report.dto';
import { UpdateReportDto } from './dto/update-report.dto';

@Injectable()
export class ReportsService {
  constructor(
    @InjectRepository(TechnicalReport) private reportRepo: Repository<TechnicalReport>,
    @InjectRepository(LogActivity)     private activityRepo: Repository<LogActivity>,
  ) {}

  async create(dto: CreateReportDto, currentUser: User) {
    const activity = await this.activityRepo.findOne({
      where: { id: dto.activity_id },
      relations: ['weekly_log', 'weekly_log.crew'],
    });
    if (!activity) throw new NotFoundException('Activity not found');

    const report = this.reportRepo.create({
      activity,
      crew:                activity.weekly_log.crew,
      additional_resource: dto.additional_resource,
      requirement:         dto.requirement,
      progress:            dto.progress,
      is_scheduled:        dto.is_scheduled ?? false,
      created_by:          currentUser,
    });

    return this.reportRepo.save(report);
  }

  async findAll(page = 1, limit = 20, crewId?: string) {
    const qb = this.reportRepo
      .createQueryBuilder('r')
      .leftJoinAndSelect('r.crew', 'crew')
      .leftJoinAndSelect('crew.field', 'field')
      .leftJoinAndSelect('r.activity', 'activity')
      .leftJoinAndSelect('activity.weekly_log', 'weekly_log')
      .where('r.deleted_at IS NULL')
      .orderBy('r.created_at', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (crewId) qb.andWhere('crew.id = :crewId', { crewId });

    const [data, total] = await qb.getManyAndCount();

    const cleaned = data.map((r) => ({
      ...r,
      activity: {
        id:          r.activity.id,
        description: r.activity.description,
        start_date:  r.activity.start_date,
        end_date:    r.activity.end_date,
        notes:       r.activity.notes,
        week_number: r.activity.weekly_log.week_number,
        year:        r.activity.weekly_log.year,
      },
    }));

    return { data: cleaned, total, page, limit, pages: Math.ceil(total / limit) };
  }

  async findOne(id: string) {
    const report = await this.reportRepo.findOne({
      where: { id },
      relations: ['crew', 'crew.field', 'activity', 'activity.weekly_log', 'created_by'],
    });
    if (!report) throw new NotFoundException('Report not found');

    return {
      ...report,
      activity: {
        id:          report.activity.id,
        description: report.activity.description,
        start_date:  report.activity.start_date,
        end_date:    report.activity.end_date,
        notes:       report.activity.notes,
        week_number: report.activity.weekly_log.week_number,
        year:        report.activity.weekly_log.year,
      },
    };
  }

  async update(id: string, dto: UpdateReportDto) {
    const report = await this.reportRepo.findOne({ where: { id } });
    if (!report) throw new NotFoundException('Report not found');

    if (dto.additional_resource !== undefined) report.additional_resource = dto.additional_resource!;
    if (dto.requirement         !== undefined) report.requirement         = dto.requirement!;
    if (dto.progress            !== undefined) report.progress            = dto.progress!;
    if (dto.is_scheduled        !== undefined) report.is_scheduled        = dto.is_scheduled!;

    return this.reportRepo.save(report);
  }

  async remove(id: string) {
    const report = await this.reportRepo.findOne({ where: { id } });
    if (!report) throw new NotFoundException('Report not found');
    await this.reportRepo.softDelete(id);
    return { message: 'Report deleted successfully' };
  }
}
