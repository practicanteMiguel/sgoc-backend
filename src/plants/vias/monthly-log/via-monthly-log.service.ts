import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ViaMonthlyLog } from '../entities/via-monthly-log.entity';
import { Field } from '../../fields/entities/field.entity';
import { User } from '../../../users/entities/user.entity';
import { CreateMonthlyLogDto } from '../dto/create-monthly-log.dto';

@Injectable()
export class ViaMonthlyLogService {
  constructor(
    @InjectRepository(ViaMonthlyLog) private logRepo: Repository<ViaMonthlyLog>,
    @InjectRepository(Field)         private fieldRepo: Repository<Field>,
  ) {}

  async create(dto: CreateMonthlyLogDto, currentUser: User) {
    const field = await this.fieldRepo.findOne({ where: { id: dto.field_id } });
    if (!field) throw new NotFoundException('Planta no encontrada');

    const existing = await this.logRepo.findOne({
      where: { field: { id: dto.field_id }, month: dto.month, year: dto.year },
    });
    if (existing) throw new ConflictException('Ya existe un registro mensual para esta planta, mes y año');

    const log = this.logRepo.create({ field, month: dto.month, year: dto.year, created_by: currentUser });
    return this.logRepo.save(log);
  }

  async findAll(page = 1, limit = 20, fieldId?: string, year?: number, month?: number) {
    const qb = this.logRepo
      .createQueryBuilder('l')
      .leftJoinAndSelect('l.field', 'field')
      .leftJoinAndSelect('l.created_by', 'created_by')
      .orderBy('l.year', 'DESC')
      .addOrderBy('l.month', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (fieldId) qb.andWhere('field.id = :fieldId', { fieldId });
    if (year)    qb.andWhere('l.year = :year', { year });
    if (month)   qb.andWhere('l.month = :month', { month });

    const [data, total] = await qb.getManyAndCount();
    return { data, total, page, limit, pages: Math.ceil(total / limit) };
  }

  async findOne(id: string) {
    const log = await this.logRepo.findOne({
      where: { id },
      relations: ['field', 'capture_groups', 'capture_groups.images', 'capture_groups.taken_by', 'created_by'],
    });
    if (!log) throw new NotFoundException('Registro mensual no encontrado');
    return log;
  }

  async getVaultToken(id: string) {
    const log = await this.logRepo.findOne({ where: { id }, select: ['id', 'vault_token'] });
    if (!log) throw new NotFoundException('Registro mensual no encontrado');
    return { vault_token: log.vault_token };
  }
}
