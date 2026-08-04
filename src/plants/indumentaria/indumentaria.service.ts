import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { randomUUID } from 'crypto';
import { Indumentaria } from './entities/indumentaria.entity';
import {
  EntregaIndumentaria,
  TipoEntrega,
} from './entities/entrega-indumentaria.entity';
import {
  EmpleadoTalla,
  TallaCategoria,
} from './entities/empleado-talla.entity';
import {
  CreateIndumentariaDto,
  UpdateIndumentariaDto,
  CreateEntregaDto,
  RegistrarEntregaBatchDto,
  UpsertTallaDto,
} from './dto/indumentaria.dto';
import { CloudinaryService } from '../activities/cloudinary/cloudinary.service';

const TALLA_CATEGORIAS: { categoria: TallaCategoria; label: string }[] = [
  { categoria: TallaCategoria.PANTALON, label: 'Pantalon' },
  { categoria: TallaCategoria.OVEROL, label: 'Overol' },
  { categoria: TallaCategoria.CAMISA, label: 'Camisa' },
  { categoria: TallaCategoria.CALZADO, label: 'Calzado' },
];

@Injectable()
export class IndumentariaService {
  constructor(
    @InjectRepository(Indumentaria) private repo: Repository<Indumentaria>,
    @InjectRepository(EntregaIndumentaria)
    private entregaRepo: Repository<EntregaIndumentaria>,
    @InjectRepository(EmpleadoTalla)
    private tallaRepo: Repository<EmpleadoTalla>,
    private cloudinary: CloudinaryService,
  ) {}

  private async generarCodigo(): Promise<string> {
    const ultimo = await this.repo
      .createQueryBuilder('i')
      .orderBy('i.codigo', 'DESC')
      .getOne();

    let siguiente = 1;
    if (ultimo) {
      const num = parseInt(ultimo.codigo.split('-')[1], 10);
      if (!isNaN(num)) siguiente = num + 1;
    }
    return `IND-${String(siguiente).padStart(3, '0')}`;
  }

  async create(dto: CreateIndumentariaDto) {
    const codigo = await this.generarCodigo();
    const item = this.repo.create({ ...dto, codigo });
    return this.repo.save(item);
  }

  async findAll(page = 1, limit = 50, search?: string, activo?: boolean) {
    const qb = this.repo
      .createQueryBuilder('i')
      .orderBy('i.codigo', 'ASC')
      .skip((page - 1) * limit)
      .take(limit);

    if (activo !== undefined) qb.andWhere('i.activo = :activo', { activo });
    if (search)
      qb.andWhere('i.nombre ILIKE :search', { search: `%${search}%` });

    const [data, total] = await qb.getManyAndCount();
    return { data, total, page, limit, pages: Math.ceil(total / limit) };
  }

  async findOne(id: string) {
    const item = await this.repo.findOne({ where: { id } });
    if (!item) throw new NotFoundException('Indumentaria no encontrada');
    return item;
  }

  async update(id: string, dto: UpdateIndumentariaDto) {
    const item = await this.findOne(id);
    Object.assign(item, dto);
    return this.repo.save(item);
  }

  async remove(id: string) {
    const item = await this.findOne(id);
    await this.repo.remove(item);
    return { message: 'Indumentaria eliminada correctamente' };
  }

  async registrarEntrega(dto: CreateEntregaDto) {
    const entrega = this.entregaRepo.create({
      empleado: { id: dto.empleado_id } as any,
      indumentaria: { id: dto.indumentaria_id } as any,
      tipo: dto.tipo,
      cantidad: dto.cantidad ?? 1,
      fecha_entrega: dto.fecha_entrega as unknown as Date,
      observacion: dto.observacion ?? null,
      fecha_autorizacion: (dto.fecha_autorizacion as unknown as Date) ?? null,
      fecha_solicitud_compras:
        (dto.fecha_solicitud_compras as unknown as Date) ?? null,
      numero_rq: dto.numero_rq ?? null,
      registrado_por: dto.registrado_por_id
        ? ({ id: dto.registrado_por_id } as any)
        : null,
    });
    return this.entregaRepo.save(entrega);
  }

  async registrarEntregaBatch(
    file: Express.Multer.File,
    dto: RegistrarEntregaBatchDto,
  ) {
    let items: {
      indumentaria_id: string;
      cantidad: number;
      talla?: string | null;
    }[];
    try {
      items = JSON.parse(dto.items);
    } catch {
      throw new BadRequestException('El campo items debe ser un JSON valido');
    }
    if (!Array.isArray(items) || items.length === 0) {
      throw new BadRequestException('Se requiere al menos un item');
    }

    const { url } = await this.cloudinary.uploadFull(
      file,
      `indumentaria/entregas/${dto.empleado_id}`,
    );
    const entregaBatchId = randomUUID();

    const entregas = items.map((item) =>
      this.entregaRepo.create({
        empleado: { id: dto.empleado_id } as any,
        indumentaria: { id: item.indumentaria_id } as any,
        tipo: dto.tipo,
        cantidad: item.cantidad,
        talla: item.talla ?? null,
        fecha_entrega: dto.fecha_entrega as unknown as Date,
        observacion: dto.observacion ?? null,
        numero_rq: dto.numero_rq ?? null,
        firma_url: url,
        entrega_batch_id: entregaBatchId,
      }),
    );

    return this.entregaRepo.save(entregas);
  }

  async getHistorialEmpleado(
    empleadoId: string,
    page = 1,
    limit = 50,
    tipo?: TipoEntrega,
  ) {
    const qb = this.entregaRepo
      .createQueryBuilder('e')
      .leftJoinAndSelect('e.indumentaria', 'ind')
      .leftJoinAndSelect('e.registrado_por', 'rp')
      .where('e.empleado_id = :empleadoId', { empleadoId })
      .orderBy('e.fecha_entrega', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (tipo) qb.andWhere('e.tipo = :tipo', { tipo });

    const [data, total] = await qb.getManyAndCount();
    return { data, total, page, limit, pages: Math.ceil(total / limit) };
  }

  async getEntregas(
    page = 1,
    limit = 50,
    tipo?: TipoEntrega,
    indumentariaId?: string,
    numeroRq?: string,
  ) {
    const qb = this.entregaRepo
      .createQueryBuilder('e')
      .leftJoinAndSelect('e.empleado', 'emp')
      .leftJoinAndSelect('e.indumentaria', 'ind')
      .leftJoinAndSelect('e.registrado_por', 'rp')
      .orderBy('e.fecha_entrega', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (tipo) qb.andWhere('e.tipo = :tipo', { tipo });
    if (indumentariaId)
      qb.andWhere('e.indumentaria_id = :indumentariaId', { indumentariaId });
    if (numeroRq) qb.andWhere('e.numero_rq = :numeroRq', { numeroRq });

    const [data, total] = await qb.getManyAndCount();
    return { data, total, page, limit, pages: Math.ceil(total / limit) };
  }

  async getTallasEmpleado(empleadoId: string) {
    const tallas = await this.tallaRepo.find({
      where: { empleado_id: empleadoId },
    });
    const tallaPorCategoria = new Map(
      tallas.map((t) => [t.categoria, t.talla]),
    );

    return TALLA_CATEGORIAS.map((c) => ({
      categoria: c.categoria,
      label: c.label,
      talla: tallaPorCategoria.get(c.categoria) ?? null,
    }));
  }

  async getTallasBulk() {
    return this.tallaRepo.find();
  }

  async upsertTallaEmpleado(
    empleadoId: string,
    categoria: TallaCategoria,
    dto: UpsertTallaDto,
  ) {
    let registro = await this.tallaRepo.findOne({
      where: { empleado_id: empleadoId, categoria },
    });
    if (registro) {
      registro.talla = dto.talla ?? null;
    } else {
      registro = this.tallaRepo.create({
        empleado: { id: empleadoId } as any,
        categoria,
        talla: dto.talla ?? null,
      });
    }
    return this.tallaRepo.save(registro);
  }

  async getCensoResumen() {
    // Suma todas las entregas (inicial + periodica + reposicion) por empleado
    // e item, para que la tabla del censo muestre el total acumulado real y
    // no solo la cantidad de la ultima entrega.
    const rows = await this.entregaRepo
      .createQueryBuilder('e')
      .select('e.empleado_id', 'empleado_id')
      .addSelect('e.indumentaria_id', 'indumentaria_id')
      .addSelect('SUM(e.cantidad)', 'cantidad')
      .addSelect('MAX(e.fecha_entrega)', 'fecha_entrega')
      .groupBy('e.empleado_id')
      .addGroupBy('e.indumentaria_id')
      .getRawMany<{
        empleado_id: string;
        indumentaria_id: string;
        cantidad: string;
        fecha_entrega: Date;
      }>();

    const porEmpleado = new Map<
      string,
      {
        empleado_id: string;
        items: {
          indumentaria_id: string;
          cantidad: number;
          fecha_entrega: Date;
        }[];
        fecha_ultima_entrega: Date | null;
      }
    >();

    for (const r of rows) {
      if (!porEmpleado.has(r.empleado_id)) {
        porEmpleado.set(r.empleado_id, {
          empleado_id: r.empleado_id,
          items: [],
          fecha_ultima_entrega: null,
        });
      }
      const bucket = porEmpleado.get(r.empleado_id)!;
      bucket.items.push({
        indumentaria_id: r.indumentaria_id,
        cantidad: Number(r.cantidad),
        fecha_entrega: r.fecha_entrega,
      });
      if (
        !bucket.fecha_ultima_entrega ||
        r.fecha_entrega > bucket.fecha_ultima_entrega
      ) {
        bucket.fecha_ultima_entrega = r.fecha_entrega;
      }
    }

    return Array.from(porEmpleado.values());
  }

  async removeEntrega(id: string) {
    const entrega = await this.entregaRepo.findOne({ where: { id } });
    if (!entrega) throw new NotFoundException('Entrega no encontrada');
    await this.entregaRepo.remove(entrega);
    return { message: 'Entrega eliminada correctamente' };
  }
}
