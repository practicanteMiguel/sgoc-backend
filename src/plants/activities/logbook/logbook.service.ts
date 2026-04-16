import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WeeklyLog } from './entities/weekly-log.entity';
import { LogActivity } from './entities/log-activity.entity';
import { Crew } from '../crews/entities/crew.entity';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { User } from '../../../users/entities/user.entity';
import { CreateWeeklyLogDto } from './dto/create-weekly-log.dto';
import { CreateActivityDto } from './dto/create-activity.dto';
import { UpdateActivityDto } from './dto/update-activity.dto';

type UploadedFiles = {
  image_before?: Express.Multer.File[];
  image_during?: Express.Multer.File[];
  image_after?:  Express.Multer.File[];
};

@Injectable()
export class LogbookService {
  constructor(
    @InjectRepository(WeeklyLog)  private logRepo: Repository<WeeklyLog>,
    @InjectRepository(LogActivity) private activityRepo: Repository<LogActivity>,
    @InjectRepository(Crew)        private crewRepo: Repository<Crew>,
    private readonly cloudinary: CloudinaryService,
  ) {}

  async create(dto: CreateWeeklyLogDto, currentUser: User) {
    const crew = await this.crewRepo.findOne({
      where: { id: dto.crew_id },
      relations: ['field'],
    });
    if (!crew) throw new NotFoundException('Crew not found');

    const exists = await this.logRepo.findOne({
      where: { crew: { id: dto.crew_id }, week_number: dto.week_number, year: dto.year },
    });
    if (exists)
      throw new ConflictException(`Week ${dto.week_number} of ${dto.year} already exists for this crew`);

    const log = this.logRepo.create({
      crew,
      week_number: dto.week_number,
      year:        dto.year,
      created_by:  currentUser,
    });

    return this.logRepo.save(log);
  }

  async findAll(page = 1, limit = 20, crewId?: string, year?: number, week?: number) {
    const qb = this.logRepo
      .createQueryBuilder('l')
      .leftJoinAndSelect('l.crew', 'crew')
      .leftJoinAndSelect('crew.field', 'field')
      .leftJoinAndSelect('l.activities', 'activities')
      .orderBy('l.year', 'DESC')
      .addOrderBy('l.week_number', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (crewId) qb.andWhere('crew.id = :crewId', { crewId });
    if (year)   qb.andWhere('l.year = :year', { year });
    if (week)   qb.andWhere('l.week_number = :week', { week });

    const [data, total] = await qb.getManyAndCount();
    return { data, total, page, limit, pages: Math.ceil(total / limit) };
  }

  async findOne(id: string) {
    const log = await this.logRepo.findOne({
      where: { id },
      relations: ['crew', 'crew.field', 'activities', 'created_by'],
    });
    if (!log) throw new NotFoundException('Weekly log not found');
    return log;
  }

  async addActivity(logId: string, dto: CreateActivityDto, files: UploadedFiles) {
    const log = await this.findOne(logId);

    const folder = this.cloudinary.buildFolder(
      log.crew.field.name,
      log.year,
      log.crew.name,
      log.week_number,
    );

    const activity = this.activityRepo.create({
      weekly_log:  log,
      description: dto.description,
      start_date:  dto.start_date as any,
      end_date:    dto.end_date as any,
      notes:       dto.notes,
    });

    if (files.image_before?.[0])
      activity.image_before = await this.cloudinary.upload(files.image_before[0], folder);
    if (files.image_during?.[0])
      activity.image_during = await this.cloudinary.upload(files.image_during[0], folder);
    if (files.image_after?.[0])
      activity.image_after = await this.cloudinary.upload(files.image_after[0], folder);

    return this.activityRepo.save(activity);
  }

  async updateActivity(activityId: string, dto: UpdateActivityDto, files: UploadedFiles) {
    const activity = await this.activityRepo.findOne({
      where: { id: activityId },
      relations: ['weekly_log', 'weekly_log.crew', 'weekly_log.crew.field'],
    });
    if (!activity) throw new NotFoundException('Activity not found');

    if (dto.description !== undefined) activity.description = dto.description;
    if (dto.start_date  !== undefined) activity.start_date  = dto.start_date as any;
    if (dto.end_date    !== undefined) activity.end_date    = dto.end_date as any;
    if (dto.notes       !== undefined) activity.notes       = dto.notes!;

    const folder = this.cloudinary.buildFolder(
      activity.weekly_log.crew.field.name,
      activity.weekly_log.year,
      activity.weekly_log.crew.name,
      activity.weekly_log.week_number,
    );

    if (files.image_before?.[0])
      activity.image_before = await this.cloudinary.upload(files.image_before[0], folder);
    if (files.image_during?.[0])
      activity.image_during = await this.cloudinary.upload(files.image_during[0], folder);
    if (files.image_after?.[0])
      activity.image_after = await this.cloudinary.upload(files.image_after[0], folder);

    return this.activityRepo.save(activity);
  }

  async removeActivity(activityId: string) {
    const activity = await this.activityRepo.findOne({ where: { id: activityId } });
    if (!activity) throw new NotFoundException('Activity not found');
    await this.activityRepo.remove(activity);
    return { message: 'Activity deleted' };
  }
}
