import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog } from './entities/audit-log.entity';

interface LogPayload {
  user_id?: string;
  action: string;
  entity_type: string;
  entity_id?: string;
  old_values?: Record<string, any>;
  new_values?: Record<string, any>;
  ip_address?: string;
  module?: string;
}

@Injectable()
export class AuditService {
  constructor(
    @InjectRepository(AuditLog)
    private auditRepo: Repository<AuditLog>,
  ) {}

  async log(payload: LogPayload) {
    await this.auditRepo.save({
      user: payload.user_id ? { id: payload.user_id } : undefined,
      action: payload.action,
      entity_type: payload.entity_type,
      entity_id: payload.entity_id,
      old_values: payload.old_values,
      new_values: payload.new_values,
      ip_address: payload.ip_address,
      module: payload.module,
    });
  }

  findAll(page = 1, limit = 50) {
    return this.auditRepo.findAndCount({
      relations: ['user'],
      order: { created_at: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
  }
}