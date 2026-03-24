import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog } from './entities/audit-log.entity';

interface LogPayload {
  user_id?:    string;
  action:      string;
  entity_type: string;
  entity_id?:  string;
  old_values?: Record<string, any>;
  new_values?: Record<string, any>;
  ip_address?: string;
  module?:     string;
}

@Injectable()
export class AuditService {
  constructor(
    @InjectRepository(AuditLog)
    private auditRepo: Repository<AuditLog>,
  ) {}

  async log(payload: LogPayload): Promise<void> {
    const entry = this.auditRepo.create({
      action:      payload.action,
      entity_type: payload.entity_type,
      entity_id:   payload.entity_id,
      old_values:  payload.old_values,
      new_values:  payload.new_values,
      ip_address:  payload.ip_address,
      module:      payload.module,
    });
    if (payload.user_id) {
      entry.user = { id: payload.user_id } as any;
    }
    await this.auditRepo.save(entry);
  }

  async findAll(
    page   = 1,
    limit  = 50,
    module?: string,
    action?: string,
    userId?: string,
  ) {
    const qb = this.auditRepo
      .createQueryBuilder('log')
      .leftJoinAndSelect('log.user', 'user')
      .orderBy('log.created_at', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (module) qb.andWhere('log.module = :module', { module });
    if (action) qb.andWhere('log.action = :action', { action });
    if (userId) qb.andWhere('user.id = :userId', { userId });

    const [data, total] = await qb.getManyAndCount();

    return {
      data: data.map((log) => ({
        id:          log.id,
        action:      log.action,
        entity_type: log.entity_type,
        entity_id:   log.entity_id,
        module:      log.module,
        new_values:  log.new_values,
        ip_address:  log.ip_address,
        created_at:  log.created_at,
        user: log.user ? {
          id:         log.user.id,
          first_name: log.user.first_name,
          last_name:  log.user.last_name,
          email:      log.user.email,
        } : null,
      })),
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    };
  }
}