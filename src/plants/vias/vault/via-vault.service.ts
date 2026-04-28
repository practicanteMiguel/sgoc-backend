import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { createHash } from 'crypto';
import { ViaCaptureGroup } from '../entities/via-capture-group.entity';
import { ViaCapture } from '../entities/via-capture.entity';
import { ViaMonthlyLog } from '../entities/via-monthly-log.entity';
import { CloudinaryService } from '../../activities/cloudinary/cloudinary.service';

@Injectable()
export class ViaVaultService {
  constructor(
    @InjectRepository(ViaCaptureGroup) private groupRepo: Repository<ViaCaptureGroup>,
    @InjectRepository(ViaCapture)      private captureRepo: Repository<ViaCapture>,
    @InjectRepository(ViaMonthlyLog)   private logRepo: Repository<ViaMonthlyLog>,
    private readonly cloudinary: CloudinaryService,
  ) {}

  async getByToken(token: string) {
    const log = await this.logRepo.findOne({
      where: { vault_token: token },
      relations: ['field', 'capture_groups', 'capture_groups.images', 'capture_groups.taken_by'],
    });
    if (!log) throw new NotFoundException('Enlace no válido');

    return {
      monthly_log_id: log.id,
      field:          log.field.name,
      month:          log.month,
      year:           log.year,
      vault_token:    log.vault_token,
      capture_groups: log.capture_groups,
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

    // Filter out exact duplicates (same name + same hash) already in this log
    const newFiles: { file: Express.Multer.File; hash: string }[] = [];
    for (const file of files) {
      const hash = createHash('sha256').update(file.buffer).digest('hex');
      const duplicate = await this.captureRepo.findOne({
        where: {
          original_name:  file.originalname,
          file_hash:      hash,
          capture_group: { monthly_log: { id: log.id } },
        },
        relations: ['capture_group'],
      });
      if (!duplicate) newFiles.push({ file, hash });
    }

    if (!newFiles.length) {
      return { message: 'Todas las imágenes ya estaban registradas', group: null };
    }

    const group = await this.groupRepo.save(
      this.groupRepo.create({
        monthly_log: log,
        lat:         meta.lat  ?? null,
        lng:         meta.lng  ?? null,
        via_name:    meta.via_name ?? null,
        comment:     meta.comment  ?? null,
        taken_by:    null,
      }),
    );

    const images: ViaCapture[] = [];
    for (const { file, hash } of newFiles) {
      const { url, public_id } = await this.cloudinary.uploadFull(file, folder);
      images.push(
        await this.captureRepo.save(
          this.captureRepo.create({
            capture_group: group,
            url,
            public_id,
            original_name: file.originalname,
            file_hash:     hash,
          }),
        ),
      );
    }

    return { ...group, images };
  }

  async getByLogId(logId: string) {
    return this.groupRepo.find({
      where: { monthly_log: { id: logId } },
      relations: ['images'],
      order: { captured_at: 'ASC' },
    });
  }
}
