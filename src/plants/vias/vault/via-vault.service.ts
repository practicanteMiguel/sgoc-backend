import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { createHash } from 'crypto';
import { ViaCapture } from '../entities/via-capture.entity';
import { ViaMonthlyLog } from '../entities/via-monthly-log.entity';
import { CloudinaryService } from '../../activities/cloudinary/cloudinary.service';

@Injectable()
export class ViaVaultService {
  constructor(
    @InjectRepository(ViaCapture)    private captureRepo: Repository<ViaCapture>,
    @InjectRepository(ViaMonthlyLog) private logRepo: Repository<ViaMonthlyLog>,
    private readonly cloudinary: CloudinaryService,
  ) {}

  async getByToken(token: string) {
    const log = await this.logRepo.findOne({
      where: { vault_token: token },
      relations: ['field', 'captures', 'captures.taken_by'],
    });
    if (!log) throw new NotFoundException('Enlace no válido');

    return {
      monthly_log_id: log.id,
      field:          log.field.name,
      month:          log.month,
      year:           log.year,
      vault_token:    log.vault_token,
      captures:       log.captures,
    };
  }

  async uploadCaptures(
    token: string,
    files: Express.Multer.File[],
    meta: { lat?: number; lng?: number; via_name?: string; comment?: string },
  ) {
    if (!files.length) throw new BadRequestException('Se requiere al menos una imagen');

    const log = await this.logRepo.findOne({
      where: { vault_token: token },
      relations: ['field'],
    });
    if (!log) throw new NotFoundException('Enlace no válido');

    const folder = this.cloudinary.buildViaFolder(log.field.name, log.year, log.month);
    const results: ViaCapture[] = [];

    for (const file of files) {
      const file_hash = createHash('sha256').update(file.buffer).digest('hex');

      const sameName = await this.captureRepo.findOne({
        where: { monthly_log: { id: log.id }, original_name: file.originalname },
      });
      if (sameName && sameName.file_hash === file_hash) {
        results.push(sameName);
        continue;
      }

      const { url, public_id } = await this.cloudinary.uploadFull(file, folder);
      const capture = this.captureRepo.create({
        monthly_log:   log,
        url,
        public_id,
        original_name: file.originalname,
        file_hash,
        lat:           meta.lat ?? null,
        lng:           meta.lng ?? null,
        via_name:      meta.via_name ?? null,
        comment:       meta.comment ?? null,
      });
      results.push(await this.captureRepo.save(capture));
    }

    return results;
  }

  async getByLogId(logId: string) {
    return this.captureRepo.find({
      where: { monthly_log: { id: logId } },
      order: { captured_at: 'ASC' },
    });
  }
}
