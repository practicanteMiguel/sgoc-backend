import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Indumentaria } from './entities/indumentaria.entity';
import { EntregaIndumentaria, TipoEntrega } from './entities/entrega-indumentaria.entity';
import { CreateIndumentariaDto, UpdateIndumentariaDto, CreateEntregaDto } from './dto/indumentaria.dto';

@Injectable()
export class IndumentariaService {
  constructor(
    @InjectRepository(Indumentaria) private repo: Repository<Indumentaria>,
    @InjectRepository(EntregaIndumentaria) private entregaRepo: Repository<EntregaIndumentaria>,
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
    if (search) qb.andWhere('i.nombre ILIKE :search', { search: `%${search}%` });

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
      empleado:               { id: dto.empleado_id } as any,
      indumentaria:           { id: dto.indumentaria_id } as any,
      tipo:                   dto.tipo,
      cantidad:               dto.cantidad ?? 1,
      fecha_entrega:          dto.fecha_entrega as unknown as Date,
      observacion:            dto.observacion ?? null,
      fecha_autorizacion:     dto.fecha_autorizacion as unknown as Date ?? null,
      fecha_solicitud_compras: dto.fecha_solicitud_compras as unknown as Date ?? null,
      numero_rq:              dto.numero_rq ?? null,
      registrado_por:         dto.registrado_por_id ? { id: dto.registrado_por_id } as any : null,
    });
    return this.entregaRepo.save(entrega);
  }

  async getHistorialEmpleado(empleadoId: string, page = 1, limit = 50, tipo?: TipoEntrega) {
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

  async getEntregas(page = 1, limit = 50, tipo?: TipoEntrega, indumentariaId?: string) {
    const qb = this.entregaRepo
      .createQueryBuilder('e')
      .leftJoinAndSelect('e.empleado', 'emp')
      .leftJoinAndSelect('e.indumentaria', 'ind')
      .leftJoinAndSelect('e.registrado_por', 'rp')
      .orderBy('e.fecha_entrega', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (tipo) qb.andWhere('e.tipo = :tipo', { tipo });
    if (indumentariaId) qb.andWhere('e.indumentaria_id = :indumentariaId', { indumentariaId });

    const [data, total] = await qb.getManyAndCount();
    return { data, total, page, limit, pages: Math.ceil(total / limit) };
  }

  async removeEntrega(id: string) {
    const entrega = await this.entregaRepo.findOne({ where: { id } });
    if (!entrega) throw new NotFoundException('Entrega no encontrada');
    await this.entregaRepo.remove(entrega);
    return { message: 'Entrega eliminada correctamente' };
  }
}
