import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DriveService } from '../drive/drive.service';
import { EvidenceFile, EvidenceCategory } from './entities/evidence-file.entity';
import { DriveFolderCache } from './entities/drive-folder-cache.entity';
import { Field } from '../plants/fields/entities/field.entity';
import { User } from '../users/entities/user.entity';
import { UploadEvidenceDto } from './dto/upload-evidence.dto';

const MONTH_NAMES: Record<number, string> = {
  1:  '01 - Enero',
  2:  '02 - Febrero',
  3:  '03 - Marzo',
  4:  '04 - Abril',
  5:  '05 - Mayo',
  6:  '06 - Junio',
  7:  '07 - Julio',
  8:  '08 - Agosto',
  9:  '09 - Septiembre',
  10: '10 - Octubre',
  11: '11 - Noviembre',
  12: '12 - Diciembre',
};

const CATEGORY_LABELS: Record<EvidenceCategory, string> = {
  [EvidenceCategory.AUSENTISMO]:  'Ausentismo',
  [EvidenceCategory.LEY_50]:      'Ley 50',
  [EvidenceCategory.DIA_FAMILIA]: 'Dia de la Familia',
  [EvidenceCategory.HORAS_EXTRA]: 'Horas Extra',
  [EvidenceCategory.CRONOGRAMA]:  'Cronograma',
  [EvidenceCategory.GENERAL]:     'General',
};

@Injectable()
export class EvidencesService {
  constructor(
    @InjectRepository(EvidenceFile)     private fileRepo:  Repository<EvidenceFile>,
    @InjectRepository(DriveFolderCache) private cacheRepo: Repository<DriveFolderCache>,
    @InjectRepository(Field)            private fieldRepo: Repository<Field>,
    private readonly drive: DriveService,
  ) {}

  async upload(
    dto: UploadEvidenceDto,
    files: Express.Multer.File[],
    user: User,
  ) {
    if (!files?.length) throw new BadRequestException('No se enviaron archivos');

    const field = await this.fieldRepo.findOne({ where: { id: dto.field_id } });
    if (!field) throw new NotFoundException('Planta no encontrada');

    const targetFolderId = await this.resolveFolder(field, dto.anio, dto.mes, dto.category);

    const saved: EvidenceFile[] = [];
    for (const file of files) {
      const { fileId, webViewLink } = await this.drive.uploadFile(
        file.originalname,
        file.mimetype,
        file.buffer,
        targetFolderId,
      );
      const record = this.fileRepo.create({
        field,
        anio:           dto.anio     ?? null,
        mes:            dto.mes      ?? null,
        category:       dto.category ?? null,
        file_name:      file.originalname,
        drive_file_id:  fileId,
        drive_web_link: webViewLink,
        uploaded_by:    user,
      });
      saved.push(await this.fileRepo.save(record));
    }

    return { uploaded: saved.length, files: saved };
  }

  async findAll(filters: {
    field_id?: string;
    anio?: number | null;
    mes?: number;
    category?: EvidenceCategory;
  }) {
    const qb = this.fileRepo
      .createQueryBuilder('e')
      .leftJoinAndSelect('e.field', 'field')
      .leftJoinAndSelect('e.uploaded_by', 'uploaded_by')
      .orderBy('e.created_at', 'DESC');

    if (filters.field_id) qb.andWhere('field.id = :fid',  { fid: filters.field_id });
    if (filters.anio)     qb.andWhere('e.anio = :anio',   { anio: filters.anio });
    if (filters.mes)      qb.andWhere('e.mes  = :mes',    { mes:  filters.mes });
    if (filters.category) qb.andWhere('e.category = :cat', { cat: filters.category });

    return qb.getMany();
  }

  async remove(id: string) {
    const record = await this.fileRepo.findOne({
      where: { id },
      relations: ['field'],
    });
    if (!record) throw new NotFoundException('Evidencia no encontrada');

    // 1. Eliminar archivo de Drive
    await this.drive.deleteFile(record.drive_file_id);

    // 2. Eliminar registro de DB
    await this.fileRepo.delete(id);

    // 3. Si la carpeta donde estaba ya no tiene archivos, limpiar su cache
    //    para que se recree en Drive si alguien vuelve a subir algo ahi
    const folderCacheKey = this.buildCacheKey(record);
    const siblings = await this.fileRepo.count({
      where: {
        field:    { id: record.field.id },
        anio:     record.anio     as any,
        mes:      record.mes      as any,
        category: record.category as any,
      },
    });
    if (siblings === 0) {
      await this.cacheRepo.delete({ path_key: folderCacheKey });
    }

    return { deleted: true };
  }

  private buildCacheKey(record: EvidenceFile): string {
    const base = `f:${record.field.id}`;
    if (!record.anio)     return base;
    if (!record.mes)      return `${base}/y:${record.anio}`;
    if (!record.category) return `${base}/y:${record.anio}/m:${record.mes}`;
    return `${base}/y:${record.anio}/m:${record.mes}/c:${record.category}`;
  }

  async clearFolderCache(fieldId?: string) {
    if (fieldId) {
      const result = await this.cacheRepo
        .createQueryBuilder()
        .delete()
        .where('path_key LIKE :prefix', { prefix: `f:${fieldId}%` })
        .execute();
      return { deleted: result.affected ?? 0 };
    }
    const result = await this.cacheRepo.createQueryBuilder().delete().execute();
    return { deleted: result.affected ?? 0 };
  }

  private async resolveFolder(
    field: Field,
    anio?: number,
    mes?: number,
    category?: EvidenceCategory,
  ): Promise<string> {
    const root = this.drive.rootFolderId;

    const fieldFolderId = await this.cached(
      `f:${field.id}`,
      () => this.drive.findOrCreateFolder(field.name, root),
    );

    if (!anio) return fieldFolderId;

    const yearFolderId = await this.cached(
      `f:${field.id}/y:${anio}`,
      () => this.drive.findOrCreateFolder(String(anio), fieldFolderId),
    );

    if (!mes) return yearFolderId;

    const monthFolderId = await this.cached(
      `f:${field.id}/y:${anio}/m:${mes}`,
      () => this.drive.findOrCreateFolder(MONTH_NAMES[mes], yearFolderId),
    );

    if (!category) return monthFolderId;

    return this.cached(
      `f:${field.id}/y:${anio}/m:${mes}/c:${category}`,
      () => this.drive.findOrCreateFolder(CATEGORY_LABELS[category], monthFolderId),
    );
  }

  private async cached(pathKey: string, create: () => Promise<string>): Promise<string> {
    const hit = await this.cacheRepo.findOne({ where: { path_key: pathKey } });
    if (hit) {
      const valid = await this.drive.folderExists(hit.drive_folder_id);
      if (valid) return hit.drive_folder_id;
      await this.cacheRepo.delete({ path_key: pathKey });
    }

    const folderId = await create();
    await this.cacheRepo.save(
      this.cacheRepo.create({ path_key: pathKey, drive_folder_id: folderId }),
    );
    return folderId;
  }
}
