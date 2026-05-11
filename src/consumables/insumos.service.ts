import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, Repository } from 'typeorm';
import { Insumo, CategoriaInsumo } from './entities/insumo.entity';
import { InsumoHistorial } from './entities/insumo-historial.entity';
import { PeriodoCerrado } from './entities/periodo-cerrado.entity';
import { CreateInsumoDto, UpdateInsumoDto, CerrarMesDto } from './dto/create-insumo.dto';
import { AppModule as ModuloEntity } from '../modules/entities/module.entity';
import { UserModuleAccess } from '../modules/entities/user-module.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationPriority } from '../notifications/entities/enum/notification-priority.enum';

const PREFIJO: Record<CategoriaInsumo, string> = {
  [CategoriaInsumo.PAPELERIA]:  'PAP',
  [CategoriaInsumo.CONSUMIBLE]: 'CON',
  [CategoriaInsumo.EPP]:        'EPP',
};

const MESES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

@Injectable()
export class InsumosService {
  constructor(
    @InjectRepository(Insumo) private repo: Repository<Insumo>,
    @InjectRepository(InsumoHistorial) private historialRepo: Repository<InsumoHistorial>,
    @InjectRepository(PeriodoCerrado) private periodoRepo: Repository<PeriodoCerrado>,
    @InjectRepository(ModuloEntity) private moduloRepo: Repository<ModuloEntity>,
    @InjectRepository(UserModuleAccess) private accessRepo: Repository<UserModuleAccess>,
    private notificationsService: NotificationsService,
  ) {}

  private async generarCodigo(categoria: CategoriaInsumo): Promise<string> {
    const prefijo = PREFIJO[categoria];
    const ultimo = await this.repo
      .createQueryBuilder('i')
      .where('i.categoria = :categoria', { categoria })
      .orderBy('i.codigo', 'DESC')
      .getOne();

    let siguiente = 1;
    if (ultimo) {
      const num = parseInt(ultimo.codigo.split('-')[1], 10);
      siguiente = num + 1;
    }
    return `${prefijo}-${String(siguiente).padStart(3, '0')}`;
  }

  async create(dto: CreateInsumoDto) {
    const codigo = await this.generarCodigo(dto.categoria);
    const insumo = this.repo.create({ ...dto, codigo });
    return this.repo.save(insumo);
  }

  async remove(id: string) {
    const insumo = await this.findOne(id);
    await this.repo.remove(insumo);
    return { message: 'Insumo eliminado correctamente' };
  }

  async findAll(
    page = 1,
    limit = 20,
    categoria?: CategoriaInsumo,
    search?: string,
    activo?: boolean,
  ) {
    const qb = this.repo
      .createQueryBuilder('i')
      .orderBy('i.categoria', 'ASC')
      .addOrderBy('i.codigo', 'ASC')
      .skip((page - 1) * limit)
      .take(limit);

    if (categoria) qb.andWhere('i.categoria = :categoria', { categoria });
    if (activo !== undefined) qb.andWhere('i.activo = :activo', { activo });
    if (search) qb.andWhere('i.descripcion ILIKE :search', { search: `%${search}%` });

    const [data, total] = await qb.getManyAndCount();
    return { data, total, page, limit, pages: Math.ceil(total / limit) };
  }

  async findOne(id: string) {
    const insumo = await this.repo.findOne({ where: { id } });
    if (!insumo) throw new NotFoundException('Insumo no encontrado');
    return insumo;
  }

  async update(id: string, dto: UpdateInsumoDto) {
    const insumo = await this.findOne(id);

    const camposAuditables: (keyof UpdateInsumoDto)[] = [
      'valor_unitario', 'proveedor_ordinario', 'proveedor_extraordinario', 'activo',
    ];
    const registros: Partial<InsumoHistorial>[] = [];

    for (const campo of camposAuditables) {
      if (!(campo in dto)) continue;
      const anterior = insumo[campo] ?? null;
      const nuevo = dto[campo] ?? null;
      if (String(anterior) === String(nuevo)) continue;
      registros.push({
        insumo_id: insumo.id,
        campo,
        anterior: anterior !== null ? String(anterior) : null,
        nuevo: nuevo !== null ? String(nuevo) : null,
      });
    }

    Object.assign(insumo, dto);
    const saved = await this.repo.save(insumo);

    if (registros.length) await this.historialRepo.save(registros);

    return saved;
  }

  async getCambios(mes: number, anio: number) {
    const inicio = new Date(anio, mes - 1, 1);
    const fin = new Date(anio, mes, 1);

    const registros = await this.historialRepo.find({
      where: { fecha: Between(inicio, fin) },
      relations: ['insumo'],
      order: { fecha: 'ASC' },
    });

    if (!registros.length) return [];

    const porInsumo = new Map<string, typeof registros>();
    for (const r of registros) {
      if (!porInsumo.has(r.insumo_id)) porInsumo.set(r.insumo_id, []);
      porInsumo.get(r.insumo_id)!.push(r);
    }

    return Array.from(porInsumo.entries()).map(([, items]) => {
      const insumo = items[0].insumo;
      return {
        id: insumo.id,
        codigo: insumo.codigo,
        descripcion: insumo.descripcion,
        cambios: items.map(r => ({
          campo: r.campo,
          anterior: r.anterior !== null ? parseFloat(r.anterior) || r.anterior : null,
          nuevo: r.nuevo !== null ? parseFloat(r.nuevo) || r.nuevo : null,
        })),
      };
    });
  }

  async getPeriodosCerrados() {
    return this.periodoRepo.find({ order: { anio: 'DESC', mes: 'DESC' } });
  }

  async cerrarMes(dto: CerrarMesDto) {
    const yaExiste = await this.periodoRepo.findOne({
      where: { mes: dto.mes, anio: dto.anio },
    });
    if (yaExiste) {
      throw new ConflictException(
        `El mes ${MESES[dto.mes - 1]} ${dto.anio} ya fue cerrado el ${yaExiste.cerrado_en.toISOString().slice(0, 10)}`,
      );
    }

    await this.periodoRepo.save(this.periodoRepo.create({ mes: dto.mes, anio: dto.anio }));

    const modulo = await this.moduloRepo.findOne({ where: { slug: 'consumables' } });
    if (!modulo) return { notificados: 0, usuarios: [] };

    const accesos = await this.accessRepo.find({
      where: { module: { id: modulo.id }, can_view: true },
      relations: ['user'],
    });

    const nombreMes = MESES[dto.mes - 1];
    const usuarios: string[] = [];

    for (const acceso of accesos) {
      if (!acceso.user || !acceso.user.is_active) continue;
      await this.notificationsService.createSystem({
        user_id: acceso.user.id,
        title: 'Lista de consumibles lista',
        message: `La lista de consumibles de ${nombreMes} ${dto.anio} ya está lista para revisar y generar el mes.`,
        priority: NotificationPriority.HIGH,
      });
      usuarios.push(`${acceso.user.first_name} ${acceso.user.last_name}`);
    }

    return { notificados: usuarios.length, usuarios };
  }
}
