import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TechnicalReport } from './entities/technical-report.entity';
import { WeeklyLog } from '../logbook/entities/weekly-log.entity';
import { User } from '../../../users/entities/user.entity';
import { CreateReportDto } from './dto/create-report.dto';
import { UpdateReportDto } from './dto/update-report.dto';

@Injectable()
export class ReportsService {
  constructor(
    @InjectRepository(TechnicalReport) private reportRepo: Repository<TechnicalReport>,
    @InjectRepository(WeeklyLog)       private logRepo: Repository<WeeklyLog>,
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

    const report = this.reportRepo.create({
      weekly_log:          log,
      crew:                log.crew,
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
      .leftJoinAndSelect('r.weekly_log', 'weekly_log')
      .leftJoinAndSelect('weekly_log.activities', 'activities')
      .where('r.deleted_at IS NULL')
      .orderBy('r.created_at', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (crewId) qb.andWhere('crew.id = :crewId', { crewId });

    const [data, total] = await qb.getManyAndCount();

    const cleaned = data.map((r) => ({
      ...r,
      weekly_log: {
        id:          r.weekly_log.id,
        week_number: r.weekly_log.week_number,
        year:        r.weekly_log.year,
        activities:  r.weekly_log.activities.map((a) => ({
          id:          a.id,
          description: a.description,
          start_date:  a.start_date,
          end_date:    a.end_date,
          notes:       a.notes,
        })),
      },
    }));

    return { data: cleaned, total, page, limit, pages: Math.ceil(total / limit) };
  }

  async findOne(id: string) {
    const report = await this.reportRepo.findOne({
      where: { id },
      relations: ['crew', 'crew.field', 'weekly_log', 'weekly_log.activities', 'created_by'],
    });
    if (!report) throw new NotFoundException('Report not found');

    return {
      ...report,
      weekly_log: {
        id:          report.weekly_log.id,
        week_number: report.weekly_log.week_number,
        year:        report.weekly_log.year,
        activities:  report.weekly_log.activities.map((a) => ({
          id:          a.id,
          description: a.description,
          start_date:  a.start_date,
          end_date:    a.end_date,
          notes:       a.notes,
          image_before: a.image_before,
          image_during: a.image_during,
          image_after:  a.image_after,
        })),
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
