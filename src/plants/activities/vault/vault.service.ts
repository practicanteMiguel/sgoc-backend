import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { createHash } from 'crypto';
import { VaultImage } from './entities/vault-image.entity';
import { WeeklyLog } from '../logbook/entities/weekly-log.entity';
import { TechnicalReport } from '../reports/entities/technical-report.entity';
import { CloudinaryService } from '../cloudinary/cloudinary.service';

@Injectable()
export class VaultService {
  constructor(
    @InjectRepository(VaultImage)     private vaultRepo: Repository<VaultImage>,
    @InjectRepository(WeeklyLog)      private logRepo: Repository<WeeklyLog>,
    @InjectRepository(TechnicalReport) private reportRepo: Repository<TechnicalReport>,
    private readonly cloudinary: CloudinaryService,
  ) {}

  async getByToken(token: string) {
    const log = await this.logRepo.findOne({
      where: { vault_token: token },
      relations: ['crew', 'crew.field', 'activities'],
    });
    if (!log) throw new NotFoundException('Enlace no válido');

    const [images, report] = await Promise.all([
      this.vaultRepo.find({
        where: { weekly_log: { id: log.id } },
        order: { uploaded_at: 'ASC' },
      }),
      this.reportRepo.findOne({ where: { weekly_log: { id: log.id } } }),
    ]);

    const used_image_urls = [
      ...log.activities.map((a) => a.image_before),
      ...log.activities.map((a) => a.image_during),
      ...log.activities.map((a) => a.image_after),
    ].filter(Boolean) as string[];

    return {
      weekly_log_id:   log.id,
      crew:            log.crew.name,
      field:           log.crew.field.name,
      week:            log.week_number,
      year:            log.year,
      is_closed:       !!report,
      used_image_urls,
      images,
    };
  }

  async uploadImages(token: string, files: Express.Multer.File[]) {
    const log = await this.logRepo.findOne({
      where: { vault_token: token },
      relations: ['crew', 'crew.field'],
    });
    if (!log) throw new NotFoundException('Enlace no válido');

    const folder = this.cloudinary.buildActivityFolder(
      log.crew.field.name,
      log.year,
      log.crew.name,
      log.week_number,
    );

    const results: VaultImage[] = [];

    for (const file of files) {
      const file_hash = createHash('sha256').update(file.buffer).digest('hex');

      const sameName = await this.vaultRepo.findOne({
        where: { weekly_log: { id: log.id }, original_name: file.originalname },
      });

      // Mismo nombre y mismo contenido: duplicado de galeria, saltar
      if (sameName && sameName.file_hash === file_hash) {
        results.push(sameName);
        continue;
      }
      // Mismo nombre pero contenido diferente: foto nueva de camara con nombre generico, subir

      const { url, public_id } = await this.cloudinary.uploadFull(file, folder);
      const image = this.vaultRepo.create({
        weekly_log:    log,
        url,
        public_id,
        original_name: file.originalname,
        file_hash,
      });
      results.push(await this.vaultRepo.save(image));
    }

    return results;
  }

  async getByLogId(logId: string) {
    return this.vaultRepo.find({
      where: { weekly_log: { id: logId } },
      order: { uploaded_at: 'ASC' },
    });
  }
}
